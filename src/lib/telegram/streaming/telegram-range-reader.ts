import { TelegramClient, Api } from "telegram";
import bigInt from "big-integer";
import { DriveFile } from "../indexer";
import { rehydrateFileLocation } from "../utils/rehydrate-media";
import { refreshFileLocation } from "../media-refresher";

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
  private activeSenders = new Map<number, any>();
  private chunkCache = new Map<number, Uint8Array>();

  constructor(
    client: TelegramClient,
    file: DriveFile,
    initialLocation?: Api.TypeInputFileLocation,
    onTelemetry?: RangeReaderTelemetryListener
  ) {
    this.client = client;
    this.file = file;
    this.fileSize = file.size;
    this.dcId = file.dcId || 2;
    this.telemetryListener = onTelemetry;

    try {
      this.location = initialLocation || rehydrateFileLocation(file);
    } catch {
      const fallbackId = (file.location as any)?.id || (file as any).docId || file.messageId;
      const safeId = typeof fallbackId === "number" || /^\d+$/.test(String(fallbackId))
        ? bigInt(String(fallbackId))
        : bigInt(file.messageId);
      this.location = new Api.InputDocumentFileLocation({
        id: safeId,
        accessHash: bigInt(String(file.accessHash || "0").replace(/\D/g, "") || "0"),
        fileReference: Buffer.alloc(0),
        thumbSize: "",
      });
    }
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

  /**
   * Retrieves or re-establishes a live pooled MTProto sender for the target media DC.
   */
  private async getSender(): Promise<any> {
    let sender = this.activeSenders.get(this.dcId);
    if (sender && typeof sender.isConnected === "function" && sender.isConnected()) {
      return sender;
    }

    this.activeSenders.delete(this.dcId);
    sender = await this.client.getSender(this.dcId);
    this.activeSenders.set(this.dcId, sender);
    return sender;
  }

  /**
   * Refreshes the file reference and sender if a 400 FILE_REFERENCE_EXPIRED error occurs.
   */
  private async refreshLocation(): Promise<void> {
    console.warn(`[TelegramRangeReader] Refreshing expired token for "${this.file.name}"...`);
    const refreshed = await refreshFileLocation(this.client, this.file);
    this.location = refreshed.location;
    if (refreshed.dcId) {
      this.dcId = refreshed.dcId;
    }
    this.activeSenders.clear();
    this.chunkCache.clear();
  }

  /**
   * Reads an arbitrary byte range [offset, offset + length - 1] from Telegram MTProto directly in the browser.
   * Decomposes the range into strictly valid 1 MiB-block boundary sub-requests and reassembles in order.
   */
  public async readRange(
    offset: number,
    length: number,
    signal?: AbortSignal
  ): Promise<Uint8Array> {
    if (this.isDestroyed || signal?.aborted) {
      throw new Error("ABORTED");
    }

    const effectiveEnd = Math.min(this.fileSize - 1, offset + length - 1);
    const exactRequestedLength = effectiveEnd - offset + 1;
    if (exactRequestedLength <= 0) {
      return new Uint8Array(0);
    }

    // Split logical range into strictly legal Telegram MTProto sub-requests
    const subRequests = splitTelegramRange(offset, exactRequestedLength, this.fileSize);
    if (subRequests.length === 0) {
      return new Uint8Array(0);
    }

    const resultBuffer = new Uint8Array(exactRequestedLength);
    let bytesWritten = 0;

    const abortController = new AbortController();
    this.abortControllers.add(abortController);

    const onParentAbort = () => abortController.abort();
    if (signal) {
      signal.addEventListener("abort", onParentAbort);
    }

    try {
      this.activeRequestsCount++;
      this.notifyTelemetry();

      for (const sub of subRequests) {
        if (this.isDestroyed || abortController.signal.aborted || signal?.aborted) {
          throw new Error("ABORTED");
        }

        const chunkData = await this.fetchSingleAlignedChunk(
          sub.alignedOffset,
          sub.limit,
          abortController.signal
        );

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
   * Fetches a single aligned chunk that strictly obeys Telegram 1 MiB boundary constraints with auto-reconnect.
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

    // Fast-path: Check in-memory chunk cache
    const cached = this.chunkCache.get(alignedOffset);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      const sender = await this.getSender();
      const request = new Api.upload.GetFile({
        location: this.location,
        offset: bigInt(alignedOffset),
        limit: limit,
        precise: true,
        cdnSupported: false,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("MTPROTO_CHUNK_TIMEOUT")), 15000)
      );

      const response: any = await Promise.race([
        this.client.invokeWithSender(request, sender),
        timeoutPromise,
      ]);
      const latency = Date.now() - startTime;

      let bytes: Uint8Array;
      if (response && response.bytes) {
        bytes = response.bytes instanceof Uint8Array ? response.bytes : new Uint8Array(response.bytes);
      } else {
        bytes = new Uint8Array(0);
      }

      // Populate LRU cache (limit to 32 chunks = 16 MiB)
      if (bytes.length > 0) {
        if (this.chunkCache.size >= 32) {
          const oldestKey = this.chunkCache.keys().next().value;
          if (oldestKey !== undefined) {
            this.chunkCache.delete(oldestKey);
          }
        }
        this.chunkCache.set(alignedOffset, bytes);
      }

      this.notifyTelemetry(latency, bytes.length);
      return bytes;
    } catch (err: any) {
      const errMsg = String(err?.message || err);

      if (signal.aborted || this.isDestroyed) {
        throw new Error("ABORTED");
      }

      // Handle Chunk Timeout
      if (errMsg.includes("MTPROTO_CHUNK_TIMEOUT") && retryCount < 3) {
        console.warn(`[TelegramRangeReader] Chunk timeout at offset ${alignedOffset}. Retrying DC ${this.dcId}...`);
        this.activeSenders.delete(this.dcId);
        return this.fetchSingleAlignedChunk(alignedOffset, limit, signal, retryCount + 1);
      }

      // Handle Telegram File Migration (e.g. FILE_MIGRATE_1, FILE_MIGRATE_5)
      const migrateMatch = errMsg.match(/FILE_MIGRATE_(\d+)/i);
      const newDc = (err as any)?.newDc || (migrateMatch ? parseInt(migrateMatch[1], 10) : null);
      if (newDc && retryCount < 3) {
        console.info(`[TelegramRangeReader] File lives in DC ${newDc}. Switching sender from DC ${this.dcId}...`);
        this.dcId = newDc;
        this.activeSenders.delete(newDc);
        return this.fetchSingleAlignedChunk(alignedOffset, limit, signal, retryCount + 1);
      }

      // Handle Telegram Token Expiration / Upgrade Needed
      if (
        (errMsg.includes("FILE_REFERENCE_EXPIRED") ||
          errMsg.includes("FILE_REFERENCE_EMPTY") ||
          errMsg.includes("FILEREF_UPGRADE_NEEDED")) &&
        retryCount < 3
      ) {
        await this.refreshLocation();
        return this.fetchSingleAlignedChunk(alignedOffset, limit, signal, retryCount + 1);
      }

      // Handle Offset Invalid (at or beyond EOF)
      if (errMsg.includes("OFFSET_INVALID")) {
        console.warn(`[TelegramRangeReader] OFFSET_INVALID at offset ${alignedOffset} - reached file boundary.`);
        return new Uint8Array(0);
      }

      // Handle Flood Wait
      if (errMsg.includes("FLOOD_WAIT_") || errMsg.includes("FLOOD_WAIT")) {
        const seconds = parseInt(errMsg.replace(/\D/g, "") || "5", 10);
        console.warn(`[TelegramRangeReader] FLOOD_WAIT_${seconds} on chunk offset ${alignedOffset}. Cooldown...`);
        await new Promise((resolve) => setTimeout(resolve, (seconds + 1) * 1000));
        if (signal.aborted || this.isDestroyed) throw new Error("ABORTED");
        return this.fetchSingleAlignedChunk(alignedOffset, limit, signal, retryCount + 1);
      }

      // Handle Connection drops / Disconnects / Transport retries
      const isConnectionError =
        errMsg.toLowerCase().includes("disconnect") ||
        errMsg.toLowerCase().includes("not connected") ||
        errMsg.toLowerCase().includes("connection closed") ||
        errMsg.toLowerCase().includes("timeout") ||
        errMsg.toLowerCase().includes("rpc_call_fail") ||
        errMsg.toLowerCase().includes("socket") ||
        errMsg.toLowerCase().includes("network");

      if (isConnectionError && retryCount < 5) {
        console.warn(`[TelegramRangeReader] Socket disconnected (${errMsg}). Auto-reconnecting sender for DC ${this.dcId}... (attempt ${retryCount + 1}/5)`);
        this.activeSenders.delete(this.dcId);

        if (!this.client.connected && this.client.connect) {
          try {
            await this.client.connect();
          } catch (_) {}
        }

        await new Promise((resolve) => setTimeout(resolve, 400));
        if (signal.aborted || this.isDestroyed) throw new Error("ABORTED");
        return this.fetchSingleAlignedChunk(alignedOffset, limit, signal, retryCount + 1);
      }

      console.error(`[TelegramRangeReader] Fatal chunk fetch error at ${alignedOffset} (limit ${limit}):`, err);
      throw err;
    }
  }

  /**
   * Aborts all active in-flight MTProto range requests.
   */
  public abortAll() {
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
    this.activeSenders.clear();
  }
}
