import { TelegramClient, Api } from "teleproto";
import bigInt from "big-integer";
import { DriveFile } from "../indexer";
import { rehydrateFileLocation } from "../utils/rehydrate-media";
import { refreshFileLocation } from "../media-refresher";
import { useDriveStore } from "../../stores/drive-store";

export interface RangeChunk {
  offset: number;
  data: Uint8Array;
}

export interface RangeReaderTelemetry {
  activeRequests: number;
  instantaneousBytesPerSec: number;
  averageBytesPerSec: number;
  totalBytesDownloaded: number;
  lastLatencyMs: number;
  dcId: number;
}

export type RangeReaderTelemetryListener = (stats: RangeReaderTelemetry) => void;

// Telegram MTProto Standard Fixed Chunk Size (512 KiB)
export const TELEGRAM_CHUNK_SIZE = 512 * 1024; // 524,288 Bytes
const MAX_CACHE_CHUNKS = 96; // 48 MiB in-memory playhead-aware LRU cache

// Sliding-window pipelining tuned for Bandwidth-Delay Product (BDP):
// Foreign transatlantic DCs (e.g. Pluto DC 1 when home DC is Venus DC 2) have 200-350ms RTT
// and need deeper concurrent pipelining across all 6 media WebSocket sessions to prevent stalls.
const HOME_PREFETCH_AHEAD_CHUNKS = 6; // 3 MiB lookahead on low-RTT home DC
const FOREIGN_PREFETCH_AHEAD_CHUNKS = 12; // 6 MiB lookahead on high-RTT foreign DCs
const HOME_MAX_CONCURRENT_PREFETCH = 4;
const FOREIGN_MAX_CONCURRENT_PREFETCH = 8;
const INITIAL_PROBE_PREFETCH_CHUNKS = 2; // Conservative until sequential playback confirms non-EOF moov
const JUMP_ABORT_THRESHOLD_CHUNKS = 4; // 2 MiB jump aborts obsolete prefetches immediately
const CHUNK_TIMEOUT_MS = 55_000; // Generous timeout for transatlantic DH + auth import + 512 KiB transfer

export interface TelegramSubRequest {
  alignedOffset: number;
  limit: number;
  logicalStartOffset: number;
  logicalLength: number;
  leadingSkip: number;
}

/**
 * Splits an arbitrary logical byte range [offset, offset + length - 1] into
 * fixed-size, power-of-two 512 KiB chunks where offset is strictly a multiple of limit (offset % limit === 0).
 * This completely satisfies Telegram MTProto upload.getFile validation rules and avoids 400 LIMIT_INVALID.
 */
export function splitTelegramRange(
  offset: number,
  length: number,
  fileSize: number
): TelegramSubRequest[] {
  const effectiveEnd = Math.min(fileSize - 1, offset + length - 1);
  const totalLengthToFetch = effectiveEnd - offset + 1;
  if (totalLengthToFetch <= 0) return [];

  const firstChunkIdx = Math.floor(offset / TELEGRAM_CHUNK_SIZE);
  const lastChunkIdx = Math.floor(effectiveEnd / TELEGRAM_CHUNK_SIZE);
  const requests: TelegramSubRequest[] = [];

  for (let chunkIdx = firstChunkIdx; chunkIdx <= lastChunkIdx; chunkIdx++) {
    const chunkStart = chunkIdx * TELEGRAM_CHUNK_SIZE;
    const chunkEnd = chunkStart + TELEGRAM_CHUNK_SIZE - 1;

    const logicalStart = Math.max(offset, chunkStart);
    const logicalEnd = Math.min(effectiveEnd, chunkEnd);
    const logicalLength = logicalEnd - logicalStart + 1;
    const leadingSkip = logicalStart - chunkStart;

    requests.push({
      alignedOffset: chunkStart,
      limit: TELEGRAM_CHUNK_SIZE,
      logicalStartOffset: logicalStart,
      logicalLength,
      leadingSkip,
    });
  }

  return requests;
}

export const DC_NAMES: Record<number, string> = {
  1: "Pluto (Miami, USA)",
  2: "Venus (Amsterdam, NL)",
  3: "Aurora (Miami, USA)",
  4: "Vesta (Amsterdam, NL)",
  5: "Flora (Singapore)",
};

interface InFlightChunkEntry {
  promise: Promise<Uint8Array>;
  controller: AbortController;
  waiters: number;
  isPrefetchOnly: boolean;
}

export class TelegramRangeReader {
  private client: TelegramClient;
  private file: DriveFile;
  private location: Api.TypeInputFileLocation;
  private dcId: number;
  private fileSize: number;

  private activeRequestsCount = 0;
  private totalBytesDownloaded = 0;
  private speedSamples: { time: number; bytes: number }[] = [];
  private lastLatencyMs = 0;
  private telemetryListener?: RangeReaderTelemetryListener;

  private isDestroyed = false;
  private abortControllers = new Set<AbortController>();
  private chunkCache = new Map<number, Uint8Array>();
  private inFlightChunks = new Map<number, InFlightChunkEntry>();
  private refreshPromise: Promise<void> | null = null;

  // Playhead & adaptive pipelining state
  private lastDemandAlignedOffset = -1;
  private sequentialChunksServed = 0;
  private floodThrottleUntil = 0;

  constructor(
    client: TelegramClient,
    file: DriveFile,
    initialLocation?: Api.TypeInputFileLocation,
    onTelemetry?: RangeReaderTelemetryListener
  ) {
    this.client = client;
    this.file = file;
    this.fileSize = file.size;
    this.dcId = file.dcId || client.session?.dcId || 2;
    this.telemetryListener = onTelemetry;

    try {
      this.location = initialLocation || rehydrateFileLocation(file);
    } catch {
      const fallbackId = (file.location as any)?.id || (file as any).docId || file.messageId;
      const safeId =
        typeof fallbackId === "number" || /^\d+$/.test(String(fallbackId))
          ? bigInt(String(fallbackId))
          : bigInt(file.messageId);
      this.location = new Api.InputDocumentFileLocation({
        id: safeId,
        accessHash: bigInt(String(file.accessHash || "0").replace(/\D/g, "") || "0"),
        fileReference: Buffer.alloc(0),
        thumbSize: "",
      });
    }

    console.info(
      `[TelegramRangeReader] Ready for "${this.file.name}" -> DC ${this.dcId} [${DC_NAMES[this.dcId] || "Unknown DC"}] (${(this.fileSize / 1048576).toFixed(1)} MB)`
    );
  }

  public setTelemetryListener(listener: RangeReaderTelemetryListener) {
    this.telemetryListener = listener;
  }

  public getDcId(): number {
    return this.dcId;
  }

  public getFileSize(): number {
    return this.fileSize;
  }

  public updateFileMetadata(file: DriveFile) {
    this.file = file;
    if (file.size > 0) {
      this.fileSize = file.size;
    }
    if (file.dcId && file.dcId !== this.dcId) {
      this.dcId = file.dcId;
    }
  }

  private isForeignDc(): boolean {
    const homeDc = this.client.session?.dcId;
    return Boolean(homeDc && this.dcId && this.dcId !== homeDc);
  }

  /**
   * Returns true once the target DC has an authorized auth key so parallel download slots
   * open concurrently instead of queuing serially behind SessionPool.keyCreation.
   */
  private isDcAuthorizedForParallel(): boolean {
    if (!this.isForeignDc()) return true;
    const dcState = (this.client as any)._dcenters?.get(this.dcId);
    return Boolean(dcState?.authorized && dcState?.authKey?.getKey());
  }

  private getTargetLookaheadChunks(): number {
    return this.isForeignDc() ? FOREIGN_PREFETCH_AHEAD_CHUNKS : HOME_PREFETCH_AHEAD_CHUNKS;
  }

  private getMaxConcurrentPrefetch(): number {
    if (Date.now() < this.floodThrottleUntil) {
      return 2;
    }
    return this.isForeignDc() ? FOREIGN_MAX_CONCURRENT_PREFETCH : HOME_MAX_CONCURRENT_PREFETCH;
  }

  /**
   * Updates playhead tracking and immediately cancels stale prefetch-only RPCs
   * when the browser jumps (e.g., seeking or fetching EOF moov atom).
   */
  private handleDemandAnchor(alignedOffset: number, requestedLength: number) {
    // Ignore tiny metadata probes (e.g. Safari bytes=0-1) for jump/sequential state
    if (requestedLength <= 4096) {
      return;
    }

    if (this.lastDemandAlignedOffset >= 0) {
      const delta = alignedOffset - this.lastDemandAlignedOffset;
      if (Math.abs(delta) > JUMP_ABORT_THRESHOLD_CHUNKS * TELEGRAM_CHUNK_SIZE) {
        // Browser jumped (seek or moov atom at EOF): abort out-of-window prefetches immediately
        const windowEnd = alignedOffset + this.getTargetLookaheadChunks() * TELEGRAM_CHUNK_SIZE;
        for (const [chunkOffset, entry] of this.inFlightChunks.entries()) {
          if (entry.isPrefetchOnly && (chunkOffset < alignedOffset || chunkOffset > windowEnd)) {
            try {
              entry.controller.abort();
            } catch {}
          }
        }
        this.sequentialChunksServed = 0;
      } else if (delta === TELEGRAM_CHUNK_SIZE || delta === 0) {
        if (delta === TELEGRAM_CHUNK_SIZE) {
          this.sequentialChunksServed++;
        }
      }
    }

    this.lastDemandAlignedOffset = alignedOffset;
  }

  /**
   * Keeps the sliding lookahead window continuously saturated across the DC's parallel
   * download WebSockets so transatlantic RTT never stalls playback.
   */
  private maintainPrefetchWindow(anchorAlignedOffset: number, allowFullWindow: boolean) {
    if (this.isDestroyed || anchorAlignedOffset < 0 || this.fileSize <= 0) return;
    if (!this.isDcAuthorizedForParallel()) return;

    // Don't prefetch when probing the very tail of the file (EOF moov atom)
    if (anchorAlignedOffset >= this.fileSize - TELEGRAM_CHUNK_SIZE) return;

    const fullLookahead = this.getTargetLookaheadChunks();
    const lookaheadChunks =
      !allowFullWindow && anchorAlignedOffset === 0
        ? Math.min(INITIAL_PROBE_PREFETCH_CHUNKS, fullLookahead)
        : fullLookahead;

    const maxConcurrent = this.getMaxConcurrentPrefetch();
    let inFlightPrefetchCount = 0;
    for (const entry of this.inFlightChunks.values()) {
      if (entry.isPrefetchOnly) {
        inFlightPrefetchCount++;
      }
    }

    for (let i = 1; i <= lookaheadChunks; i++) {
      if (inFlightPrefetchCount >= maxConcurrent) break;

      const targetOffset = anchorAlignedOffset + i * TELEGRAM_CHUNK_SIZE;
      if (targetOffset >= this.fileSize) break;
      if (this.chunkCache.has(targetOffset) || this.inFlightChunks.has(targetOffset)) {
        continue;
      }

      this.triggerPrefetch(targetOffset);
      inFlightPrefetchCount++;
    }
  }

  /**
   * Stores a 512 KiB chunk in the playhead-aware cache. When full, evicts chunks
   * behind the active playhead first so upcoming prefetched chunks are never discarded.
   */
  private cacheChunk(alignedOffset: number, bytes: Uint8Array) {
    if (bytes.length === 0) return;

    if (this.chunkCache.has(alignedOffset)) {
      this.chunkCache.delete(alignedOffset);
      this.chunkCache.set(alignedOffset, bytes);
      return;
    }

    while (this.chunkCache.size >= MAX_CACHE_CHUNKS) {
      let evictKey: number | undefined;
      const playhead = this.lastDemandAlignedOffset;

      if (playhead >= 0) {
        const protectBehind = playhead - 2 * TELEGRAM_CHUNK_SIZE;
        const protectAhead = playhead + (this.getTargetLookaheadChunks() + 2) * TELEGRAM_CHUNK_SIZE;

        // 1. Prefer evicting the farthest-behind chunk outside the small behind-playhead cushion
        for (const key of this.chunkCache.keys()) {
          if (key < protectBehind) {
            evictKey = key;
            break;
          }
        }
        // 2. Otherwise evict any chunk outside the active lookahead window
        if (evictKey === undefined) {
          for (const key of this.chunkCache.keys()) {
            if (key < playhead || key > protectAhead) {
              evictKey = key;
              break;
            }
          }
        }
      }

      // 3. Fallback to oldest LRU entry
      if (evictKey === undefined) {
        evictKey = this.chunkCache.keys().next().value;
      }

      if (evictKey !== undefined) {
        this.chunkCache.delete(evictKey);
      } else {
        break;
      }
    }

    this.chunkCache.set(alignedOffset, bytes);
  }

  private notifyTelemetry(latencyMs = 0, newBytes = 0) {
    if (this.isDestroyed || !this.telemetryListener) return;

    const now = Date.now();
    if (newBytes > 0) {
      this.totalBytesDownloaded += newBytes;
      this.speedSamples.push({ time: now, bytes: newBytes });
      this.lastLatencyMs = latencyMs;
    }

    this.speedSamples = this.speedSamples.filter((s) => now - s.time <= 2000);
    const windowBytes = this.speedSamples.reduce((acc, s) => acc + s.bytes, 0);
    const windowTimeSec = Math.max(0.2, (now - (this.speedSamples[0]?.time || now - 500)) / 1000);
    const instantaneousSpeed = Math.round(windowBytes / windowTimeSec);

    this.telemetryListener({
      activeRequests: this.activeRequestsCount,
      instantaneousBytesPerSec: instantaneousSpeed,
      averageBytesPerSec: instantaneousSpeed,
      totalBytesDownloaded: this.totalBytesDownloaded,
      lastLatencyMs: this.lastLatencyMs,
      dcId: this.dcId,
    });
  }

  private async ensureClientConnected(): Promise<void> {
    if (!this.client.connected && typeof this.client.connect === "function") {
      try {
        await this.client.connect();
      } catch (_) {}
    }
  }

  /**
   * Invalidates ONLY a foreign DC's auth key & pooled slots when the server explicitly rejects
   * authorization (401 AUTH_KEY_UNREGISTERED / SESSION_REVOKED). Never destroys the home DC session.
   */
  private async resetForeignDcAuth(dcId: number): Promise<void> {
    if (dcId === this.client.session?.dcId) return;
    if (typeof (this.client as any).invalidateDcAuthKey === "function") {
      await (this.client as any).invalidateDcAuthKey(dcId);
    }
  }

  /**
   * Single-flight file_reference refresh when MTProto returns FILE_REFERENCE_EXPIRED/EMPTY.
   * Crucially does NOT tear down live DC connections or wipe auth keys.
   */
  private async refreshLocation(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      console.warn(`[TelegramRangeReader] Refreshing expired file reference for "${this.file.name}"...`);
      const refreshed = await refreshFileLocation(this.client, this.file);
      this.location = refreshed.location;
      if (refreshed.dcId && refreshed.dcId !== this.dcId) {
        console.info(
          `[TelegramRangeReader] Refreshed metadata moved "${this.file.name}" from DC ${this.dcId} -> DC ${refreshed.dcId}`
        );
        this.dcId = refreshed.dcId;
      }
      if (refreshed.fileSize && refreshed.fileSize > 0) {
        this.fileSize = refreshed.fileSize;
      }
    })().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  /**
   * Reads a single 512 KiB-aligned sub-request slice for streaming ReadableStream HTTP 206 responses.
   * Immediately pipelines the sliding lookahead window before and after serving the chunk.
   */
  public async readSubRequest(
    sub: TelegramSubRequest,
    signal?: AbortSignal,
    totalStreamLength?: number
  ): Promise<Uint8Array> {
    if (this.isDestroyed || signal?.aborted) {
      throw new Error("ABORTED");
    }

    const effectiveRequestLen = totalStreamLength ?? sub.logicalLength;
    this.handleDemandAnchor(sub.alignedOffset, effectiveRequestLen);

    const isStreamingRead = effectiveRequestLen > 4096;
    const allowFullWindow = this.sequentialChunksServed >= 1 || sub.alignedOffset > 0;

    if (isStreamingRead) {
      this.maintainPrefetchWindow(sub.alignedOffset, allowFullWindow);
    }

    const abortController = new AbortController();
    this.abortControllers.add(abortController);
    const onParentAbort = () => abortController.abort();
    if (signal) {
      signal.addEventListener("abort", onParentAbort, { once: true });
    }

    try {
      this.activeRequestsCount++;
      this.notifyTelemetry();

      const chunkData = await this.getOrFetchAlignedChunk(
        sub.alignedOffset,
        sub.limit,
        abortController.signal,
        false
      );

      // Re-run lookahead after chunk completes (catches the exact moment a brand-new foreign DC finishes auth)
      if (isStreamingRead && chunkData.length > 0 && !this.isDestroyed) {
        this.maintainPrefetchWindow(sub.alignedOffset, allowFullWindow);
      }

      if (!chunkData || chunkData.length === 0 || sub.leadingSkip >= chunkData.length) {
        return new Uint8Array(0);
      }

      const usableBytes = chunkData.subarray(sub.leadingSkip);
      const bytesToCopy = Math.min(sub.logicalLength, usableBytes.length);
      return bytesToCopy > 0 ? usableBytes.subarray(0, bytesToCopy) : new Uint8Array(0);
    } finally {
      this.activeRequestsCount = Math.max(0, this.activeRequestsCount - 1);
      this.abortControllers.delete(abortController);
      if (signal) {
        signal.removeEventListener("abort", onParentAbort);
      }
      this.notifyTelemetry();
    }
  }

  /**
   * Reads an arbitrary byte range [offset, offset + length - 1] from Telegram MTProto directly in the browser.
   * Decomposes the range into strictly valid 512 KiB-aligned sub-requests, fetches them in parallel,
   * and reassembles them in exact order.
   */
  public async readRange(
    offset: number,
    length: number,
    signal?: AbortSignal
  ): Promise<Uint8Array> {
    if (this.isDestroyed || signal?.aborted) {
      throw new Error("ABORTED");
    }

    // If cached file size was missing/0, refresh metadata before slicing
    if (this.fileSize <= 0) {
      await this.refreshLocation();
      if (this.fileSize <= 0) {
        return new Uint8Array(0);
      }
    }

    const effectiveEnd = Math.min(this.fileSize - 1, offset + length - 1);
    const exactRequestedLength = effectiveEnd - offset + 1;
    if (exactRequestedLength <= 0) {
      return new Uint8Array(0);
    }

    const subRequests = splitTelegramRange(offset, exactRequestedLength, this.fileSize);
    if (subRequests.length === 0) {
      return new Uint8Array(0);
    }

    const firstAligned = subRequests[0].alignedOffset;
    const lastAligned = subRequests[subRequests.length - 1].alignedOffset;
    const isStreamingRead = exactRequestedLength > 4096;

    this.handleDemandAnchor(firstAligned, exactRequestedLength);
    const allowFullWindow = this.sequentialChunksServed >= 1 || firstAligned > 0 || subRequests.length > 1;

    if (isStreamingRead) {
      this.maintainPrefetchWindow(lastAligned, allowFullWindow);
    }

    const abortController = new AbortController();
    this.abortControllers.add(abortController);

    const onParentAbort = () => abortController.abort();
    if (signal) {
      signal.addEventListener("abort", onParentAbort, { once: true });
    }

    try {
      this.activeRequestsCount++;
      this.notifyTelemetry();

      // Fetch all required 512 KiB chunks concurrently across the DC's media pool
      const chunkDatas = await Promise.all(
        subRequests.map((sub) =>
          this.getOrFetchAlignedChunk(
            sub.alignedOffset,
            sub.limit,
            abortController.signal,
            false
          )
        )
      );

      if (this.isDestroyed || abortController.signal.aborted || signal?.aborted) {
        throw new Error("ABORTED");
      }

      const resultBuffer = new Uint8Array(exactRequestedLength);
      let bytesWritten = 0;

      for (let i = 0; i < subRequests.length; i++) {
        const sub = subRequests[i];
        const chunkData = chunkDatas[i];

        if (!chunkData || chunkData.length === 0) {
          break; // Reached EOF
        }
        if (sub.leadingSkip >= chunkData.length) {
          break;
        }

        const usableBytes = chunkData.subarray(sub.leadingSkip);
        const bytesNeeded = exactRequestedLength - bytesWritten;
        const bytesToCopy = Math.min(bytesNeeded, sub.logicalLength, usableBytes.length);

        if (bytesToCopy <= 0) {
          break;
        }

        resultBuffer.set(usableBytes.subarray(0, bytesToCopy), bytesWritten);
        bytesWritten += bytesToCopy;

        if (bytesWritten >= exactRequestedLength) {
          break;
        }
      }

      if (bytesWritten > 0 && isStreamingRead && !this.isDestroyed) {
        this.lastDemandAlignedOffset = lastAligned;
        this.maintainPrefetchWindow(lastAligned, allowFullWindow);
      }

      return resultBuffer.subarray(0, bytesWritten);
    } finally {
      this.activeRequestsCount = Math.max(0, this.activeRequestsCount - 1);
      this.abortControllers.delete(abortController);
      if (signal) {
        signal.removeEventListener("abort", onParentAbort);
      }
      this.notifyTelemetry();
    }
  }

  /**
   * Proactively prefetches an aligned 512 KiB chunk into the playhead-aware cache.
   * Deduplicated via `inFlightChunks`, so an upcoming browser Range request seamlessly joins it.
   */
  private triggerPrefetch(offset: number) {
    if (this.isDestroyed || offset >= this.fileSize) return;
    const alignedOffset = Math.floor(offset / TELEGRAM_CHUNK_SIZE) * TELEGRAM_CHUNK_SIZE;
    if (alignedOffset >= this.fileSize) return;

    if (this.chunkCache.has(alignedOffset) || this.inFlightChunks.has(alignedOffset)) {
      return;
    }

    const prefetchController = new AbortController();
    this.abortControllers.add(prefetchController);

    this.getOrFetchAlignedChunk(alignedOffset, TELEGRAM_CHUNK_SIZE, prefetchController.signal, true)
      .then((bytes) => {
        // Keep the sliding pipeline saturated as soon as any prefetched chunk completes
        if (!this.isDestroyed && bytes.length > 0 && this.lastDemandAlignedOffset >= 0) {
          this.maintainPrefetchWindow(
            this.lastDemandAlignedOffset,
            this.sequentialChunksServed >= 1 || this.lastDemandAlignedOffset > 0
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        this.abortControllers.delete(prefetchController);
      });
  }

  /**
   * Deduplicates concurrent requests for the exact same 512 KiB aligned chunk (e.g. prefetch + playback
   * or overlapping browser range probes). Cancels the underlying MTProto RPC only if all waiters abort.
   */
  private async getOrFetchAlignedChunk(
    alignedOffset: number,
    limit: number,
    signal: AbortSignal,
    isPrefetch: boolean
  ): Promise<Uint8Array> {
    if (this.isDestroyed || signal.aborted) {
      throw new Error("ABORTED");
    }

    // Fast-path: cache hit (refresh recency)
    const cached = this.chunkCache.get(alignedOffset);
    if (cached) {
      this.chunkCache.delete(alignedOffset);
      this.chunkCache.set(alignedOffset, cached);
      return cached;
    }

    let entry = this.inFlightChunks.get(alignedOffset);
    if (!entry) {
      const fetchController = new AbortController();
      const promise = this.fetchSingleAlignedChunk(alignedOffset, limit, fetchController.signal)
        .finally(() => {
          if (this.inFlightChunks.get(alignedOffset) === entry) {
            this.inFlightChunks.delete(alignedOffset);
          }
        });

      entry = {
        promise,
        controller: fetchController,
        waiters: 0,
        isPrefetchOnly: isPrefetch,
      };
      this.inFlightChunks.set(alignedOffset, entry);
    } else if (!isPrefetch) {
      // Promote an in-flight prefetch to an active demand fetch
      entry.isPrefetchOnly = false;
    }

    const activeEntry = entry;
    activeEntry.waiters++;

    return await new Promise<Uint8Array>((resolve, reject) => {
      let settled = false;

      const onAbort = () => {
        if (settled) return;
        settled = true;
        activeEntry.waiters = Math.max(0, activeEntry.waiters - 1);
        // Only cancel the underlying MTProto request if NO waiters remain
        if (activeEntry.waiters === 0) {
          try {
            activeEntry.controller.abort();
          } catch {}
        }
        reject(new Error("ABORTED"));
      };

      if (signal.aborted || this.isDestroyed) {
        onAbort();
        return;
      }

      signal.addEventListener("abort", onAbort, { once: true });

      activeEntry.promise.then(
        (data) => {
          if (settled) return;
          settled = true;
          signal.removeEventListener("abort", onAbort);
          activeEntry.waiters = Math.max(0, activeEntry.waiters - 1);
          resolve(data);
        },
        (err) => {
          if (settled) return;
          settled = true;
          signal.removeEventListener("abort", onAbort);
          activeEntry.waiters = Math.max(0, activeEntry.waiters - 1);
          reject(err);
        }
      );
    });
  }

  /**
   * Executes a single upload.GetFile RPC using teleproto's native multi-DC FileTransfers download pool
   * (`client._files.run`), which provides:
   *  - 6 parallel media sessions per DC (primary gateway for DH + ImportAuth, `-1` media cluster once authorized)
   *  - Proper SessionSlot leasing (prevents idle disconnects mid-stream)
   *  - True MTProto request cancellation (`RpcDropAnswer`) when browser aborts on seek
   *  - Built-in SlotRemovedError, FLOOD_WAIT, and 5xx server recovery
   */
  private async executeGetFileRpc(
    alignedOffset: number,
    limit: number,
    signal: AbortSignal
  ): Promise<any> {
    await this.ensureClientConnected();

    const requestController = new AbortController();
    let timedOut = false;

    const onAbort = () => requestController.abort();
    if (signal.aborted || this.isDestroyed) {
      throw new Error("ABORTED");
    }
    signal.addEventListener("abort", onAbort, { once: true });

    const timeoutId = setTimeout(() => {
      timedOut = true;
      requestController.abort();
    }, CHUNK_TIMEOUT_MS);

    const buildRequest = () =>
      new Api.upload.GetFile({
        location: this.location,
        offset: bigInt(alignedOffset),
        limit,
        precise: true,
        cdnSupported: false,
      });

    try {
      const filesEngine = (this.client as any)._files;
      if (filesEngine && typeof filesEngine.run === "function") {
        return await filesEngine.run(
          "download",
          this.dcId,
          buildRequest,
          requestController.signal
        );
      }

      // Fallback to direct leased invoke on target DC if _files engine is unavailable
      return await (this.client as any).invoke(buildRequest(), this.dcId, {
        signal: requestController.signal,
      });
    } catch (err) {
      if (timedOut) {
        throw new Error("MTPROTO_CHUNK_TIMEOUT");
      }
      if (signal.aborted || this.isDestroyed) {
        throw new Error("ABORTED");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
      signal.removeEventListener("abort", onAbort);
    }
  }

  /**
   * Fetches a single 512 KiB aligned chunk with structured recovery for FILE_MIGRATE_X,
   * FILE_REFERENCE_EXPIRED, foreign-DC 401 re-authorization, FLOOD_WAIT, and transient disconnects.
   */
  private async fetchSingleAlignedChunk(
    alignedOffset: number,
    limit: number,
    signal: AbortSignal,
    retryCount = 0
  ): Promise<Uint8Array> {
    if (this.isDestroyed || signal.aborted) {
      throw new Error("ABORTED");
    }

    const cached = this.chunkCache.get(alignedOffset);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      const response = await this.executeGetFileRpc(alignedOffset, limit, signal);
      const latency = Date.now() - startTime;

      let bytes: Uint8Array;
      if (response && response.bytes) {
        bytes =
          response.bytes instanceof Uint8Array
            ? response.bytes
            : new Uint8Array(response.bytes);
      } else {
        bytes = new Uint8Array(0);
      }

      if (bytes.length > 0) {
        this.cacheChunk(alignedOffset, bytes);
      }

      this.notifyTelemetry(latency, bytes.length);
      return bytes;
    } catch (err: any) {
      const errMsg = String(err?.errorMessage || err?.message || err);

      if (signal.aborted || this.isDestroyed || errMsg === "ABORTED") {
        throw new Error("ABORTED");
      }

      // 1. Handle Telegram File Migration (e.g. FILE_MIGRATE_1, FILE_MIGRATE_5)
      const migrateMatch = errMsg.match(/FILE_MIGRATE_(\d+)/i);
      const newDc =
        (err as any)?.newDc || (migrateMatch ? parseInt(migrateMatch[1], 10) : null);
      if (newDc && newDc !== this.dcId && retryCount < 4) {
        console.info(
          `[TelegramRangeReader] File "${this.file.name}" lives in DC ${newDc} [${DC_NAMES[newDc] || "DC"}]. Switching from DC ${this.dcId}...`
        );
        this.dcId = newDc;
        try {
          useDriveStore.getState().updateFile(this.file.id, { dcId: newDc });
        } catch {}
        return this.fetchSingleAlignedChunk(alignedOffset, limit, signal, retryCount + 1);
      }

      // 2. Handle Expired / Empty File Reference (without destroying live DC connections)
      if (
        (errMsg.includes("FILE_REFERENCE_EXPIRED") ||
          errMsg.includes("FILE_REFERENCE_EMPTY") ||
          errMsg.includes("FILEREF_UPGRADE_NEEDED") ||
          errMsg.includes("FILE_ID_INVALID")) &&
        retryCount < 3
      ) {
        await this.refreshLocation();
        if (signal.aborted || this.isDestroyed) throw new Error("ABORTED");
        return this.fetchSingleAlignedChunk(alignedOffset, limit, signal, retryCount + 1);
      }

      // 3. Handle Offset Invalid (at or beyond EOF)
      if (errMsg.includes("OFFSET_INVALID") || errMsg.includes("LIMIT_INVALID")) {
        console.warn(
          `[TelegramRangeReader] ${errMsg} at offset ${alignedOffset} on DC ${this.dcId} — reached file boundary.`
        );
        return new Uint8Array(0);
      }

      // 4. Handle Flood Wait (also dial down prefetch concurrency temporarily)
      if (errMsg.includes("FLOOD_WAIT_") || errMsg.includes("FLOOD_PREMIUM_WAIT_")) {
        this.floodThrottleUntil = Date.now() + 30_000;
        const seconds = Math.min(30, parseInt(errMsg.replace(/\D/g, "") || "3", 10));
        console.warn(
          `[TelegramRangeReader] ${errMsg} on DC ${this.dcId} chunk ${alignedOffset}. Waiting ${seconds}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, (seconds + 1) * 1000));
        if (signal.aborted || this.isDestroyed) throw new Error("ABORTED");
        return this.fetchSingleAlignedChunk(alignedOffset, limit, signal, retryCount + 1);
      }

      // 5. Handle Foreign-DC Authorization Errors (AUTH_KEY_UNREGISTERED / AUTH_BYTES_INVALID / 401)
      const isAuthError =
        errMsg.includes("AUTH_KEY_UNREGISTERED") ||
        errMsg.includes("authorization key is not registered") ||
        errMsg.includes("PFS temporary key has expired") ||
        errMsg.includes("AUTH_BYTES_INVALID") ||
        errMsg.includes("AUTH_KEY_INVALID") ||
        errMsg.includes("SESSION_REVOKED") ||
        errMsg.includes("SESSION_EXPIRED") ||
        errMsg.includes("Authorization for dc") ||
        (err as any)?.code === 401;

      if (isAuthError && retryCount < 3) {
        console.warn(
          `[TelegramRangeReader] DC ${this.dcId} auth error (${errMsg}). Resetting DC ${this.dcId} key & re-exporting auth... (attempt ${retryCount + 1}/3)`
        );
        await this.resetForeignDcAuth(this.dcId);
        await new Promise((resolve) => setTimeout(resolve, 400 * (retryCount + 1)));
        if (signal.aborted || this.isDestroyed) throw new Error("ABORTED");
        return this.fetchSingleAlignedChunk(alignedOffset, limit, signal, retryCount + 1);
      }

      // 6. Handle Chunk Timeout & Transient Transport/Slot Errors
      const lowerMsg = errMsg.toLowerCase();
      const isRetryableTransport =
        errMsg.includes("MTPROTO_CHUNK_TIMEOUT") ||
        lowerMsg.includes("disconnect") ||
        lowerMsg.includes("not connected") ||
        lowerMsg.includes("connection closed") ||
        lowerMsg.includes("connection to") ||
        lowerMsg.includes("timeout") ||
        lowerMsg.includes("timed out") ||
        lowerMsg.includes("slot removed") ||
        lowerMsg.includes("rpc_call_fail") ||
        lowerMsg.includes("worker_busy") ||
        lowerMsg.includes("socket") ||
        lowerMsg.includes("network");

      if (isRetryableTransport && retryCount < 4) {
        console.warn(
          `[TelegramRangeReader] DC ${this.dcId} transient transport error at offset ${alignedOffset} (${errMsg}). Retrying... (${retryCount + 1}/4)`
        );
        await new Promise((resolve) => setTimeout(resolve, 500 * (retryCount + 1)));
        if (signal.aborted || this.isDestroyed) throw new Error("ABORTED");
        return this.fetchSingleAlignedChunk(alignedOffset, limit, signal, retryCount + 1);
      }

      console.error(
        `[TelegramRangeReader] Fatal chunk fetch error on DC ${this.dcId} at ${alignedOffset} (limit ${limit}):`,
        err
      );
      throw err;
    }
  }

  /**
   * Aborts all active in-flight MTProto range requests.
   */
  public abortAll() {
    for (const entry of this.inFlightChunks.values()) {
      try {
        entry.controller.abort();
      } catch {}
    }
    this.inFlightChunks.clear();

    for (const controller of this.abortControllers) {
      try {
        controller.abort();
      } catch {}
    }
    this.abortControllers.clear();
    this.activeRequestsCount = 0;
    this.notifyTelemetry();
  }

  /**
   * Cleans up resources.
   */
  public destroy() {
    this.isDestroyed = true;
    this.abortAll();
    this.chunkCache.clear();
  }
}
