import { TelegramClient } from "teleproto";
import { DriveFile } from "@/lib/telegram/indexer";
import {
  TelegramRangeReader,
  TelegramSubRequest,
  splitTelegramRange,
} from "@/lib/telegram/streaming/telegram-range-reader";
import { refreshFileLocation } from "@/lib/telegram/media-refresher";

const readerCache = new Map<string, TelegramRangeReader>();
const activeStreamFiles = new Map<string, DriveFile>();

// Streaming HTTP 206 windows delivered chunk-by-chunk (512 KiB per pull) over ReadableStream.
// First 512 KiB streams immediately (fast TTFB), while larger windows eliminate per-512 KiB
// HTTP request churn so the browser's media pipeline builds a deep playback buffer smoothly.
const SMALL_PROBE_BYTES = 64 * 1024; // Honor tiny explicit probes (e.g. Safari bytes=0-1) verbatim
const INITIAL_STREAM_WINDOW_BYTES = 4 * 1024 * 1024; // 4 MiB for initial start=0 stream
const MEDIA_STREAM_WINDOW_BYTES = 12 * 1024 * 1024; // 12 MiB for steady-state playback windows
const FULL_DOC_MAX_BYTES = 25 * 1024 * 1024; // Full 200 OK streaming for non-media docs <= 25 MiB

export function registerActiveStreamFile(file: DriveFile) {
  if (file && file.id) {
    activeStreamFiles.set(file.id, file);
    const existingReader = readerCache.get(file.id);
    if (existingReader) {
      existingReader.updateFileMetadata(file);
    }
  }
}

export function unregisterActiveStreamFile(fileId: string) {
  activeStreamFiles.delete(fileId);
  const reader = readerCache.get(fileId);
  if (reader) {
    reader.destroy();
    readerCache.delete(fileId);
  }
}

export function unregisterAllActiveStreamFiles() {
  activeStreamFiles.clear();
  for (const reader of readerCache.values()) {
    try {
      reader.destroy();
    } catch (_) {}
  }
  readerCache.clear();
}

export async function ensureStreamBridgeReady(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;

  if (navigator.serviceWorker.controller) {
    return true;
  }

  try {
    const readyWithTimeout = Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((r) => setTimeout(() => r(null), 1500)),
    ]);
    await readyWithTimeout;
    if (navigator.serviceWorker.controller) return true;

    // Wait up to 1000ms for clients.claim() controller change
    return await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
        resolve(!!navigator.serviceWorker.controller);
      }, 1000);

      const onControllerChange = () => {
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
        resolve(true);
      };

      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    });
  } catch {
    return false;
  }
}

function toTransferableBuffer(slice: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(slice.byteLength);
  copy.set(slice);
  return copy.buffer;
}

function formatDcLabel(dcId: number | undefined): string {
  switch (dcId) {
    case 1:
      return "Pluto (DC 1)";
    case 2:
      return "Venus (DC 2)";
    case 3:
      return "Aurora (DC 3)";
    case 4:
      return "Vesta (DC 4)";
    case 5:
      return "Flora (DC 5)";
    default:
      return `DC ${dcId || "default"}`;
  }
}

async function fetchSubWithRetry(
  getReader: () => TelegramRangeReader,
  sub: TelegramSubRequest,
  totalStreamLength: number,
  fileId: string,
  fileName: string,
  signal: AbortSignal
): Promise<Uint8Array> {
  let lastErr: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (!activeStreamFiles.has(fileId) || signal.aborted) {
        throw new Error("ABORTED");
      }
      const reader = getReader();
      return await reader.readSubRequest(sub, signal, totalStreamLength);
    } catch (err: any) {
      lastErr = err;
      const errMsg = String(err?.message || err);
      if (errMsg.includes("ABORTED") || !activeStreamFiles.has(fileId) || signal.aborted) {
        throw new Error("ABORTED");
      }
      console.warn(
        `[StreamBridge] Chunk fetch attempt ${attempt + 1}/2 failed for "${fileName}" @ ${sub.alignedOffset}:`,
        errMsg
      );
      if (attempt < 1) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }
  }

  throw lastErr || new Error("Failed to fetch stream chunk from Telegram");
}

let isBridgeInitialized = false;

export function initStreamBridge(getClient: () => TelegramClient | null) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (isBridgeInitialized) return;
  isBridgeInitialized = true;

  try {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[StreamBridge] ServiceWorker registered with scope:", reg.scope);
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn("[StreamBridge] ServiceWorker registration deferred:", err);
      });

    navigator.serviceWorker.addEventListener("message", async (event) => {
      if (event.data?.type !== "VAULTGRAM_STREAM_REQUEST") return;

      const { fileId, range, streamProtocol } = event.data;
      const supportsStreaming = streamProtocol === 2;
      const port: MessagePort = event.ports[0];
      if (!port) return;

      const rangeAbortController = new AbortController();
      let pendingPullCredits = 0;
      let wakePullWaiter: (() => void) | null = null;
      let headersSent = false;

      const waitForPull = (): Promise<boolean> => {
        if (rangeAbortController.signal.aborted) return Promise.resolve(false);
        if (pendingPullCredits > 0) {
          pendingPullCredits--;
          return Promise.resolve(true);
        }
        return new Promise<boolean>((resolve) => {
          const onAbort = () => {
            wakePullWaiter = null;
            resolve(false);
          };
          wakePullWaiter = () => {
            rangeAbortController.signal.removeEventListener("abort", onAbort);
            wakePullWaiter = null;
            if (rangeAbortController.signal.aborted) {
              resolve(false);
            } else {
              if (pendingPullCredits > 0) pendingPullCredits--;
              resolve(true);
            }
          };
          rangeAbortController.signal.addEventListener("abort", onAbort, { once: true });
        });
      };

      port.onmessage = (msgEvent) => {
        const msgType = msgEvent.data?.type;
        if (msgType === "ABORT") {
          rangeAbortController.abort();
        } else if (msgType === "PULL") {
          pendingPullCredits++;
          wakePullWaiter?.();
        }
      };

      try {
        const client = getClient();
        if (!client) {
          port.postMessage({
            type: "ERROR",
            error: "Telegram MTProto client is not available or disconnected",
          });
          return;
        }

        // 1. Locate file metadata strictly from active stream files
        let file = activeStreamFiles.get(fileId);
        if (!file) {
          file = Array.from(activeStreamFiles.values()).find(
            (f) => f.id.endsWith(fileId) || fileId.endsWith(f.id)
          );
        }

        if (!file) {
          port.postMessage({ type: "ERROR", error: "ABORTED" });
          return;
        }

        // If cached file size was 0 or missing, refresh metadata once from Telegram
        if (!file.size || file.size <= 0) {
          try {
            const refreshed = await refreshFileLocation(client, file);
            if (refreshed.fileSize && refreshed.fileSize > 0) {
              file = {
                ...file,
                size: refreshed.fileSize,
                dcId: refreshed.dcId ?? file.dcId,
                mimeType: refreshed.mimeType ?? file.mimeType,
              };
              activeStreamFiles.set(file.id, file);
            }
          } catch (refreshErr) {
            console.warn("[StreamBridge] Failed to refresh missing file size:", refreshErr);
          }
        }

        const resolvedFile = file;
        const getOrCreateReader = () => {
          let r = readerCache.get(resolvedFile.id);
          if (!r || (r as any).isDestroyed) {
            r = new TelegramRangeReader(client, resolvedFile);
            readerCache.set(resolvedFile.id, r);
          }
          return r;
        };

        const reader = getOrCreateReader();
        const fileSize = reader.getFileSize() || resolvedFile.size;
        if (!fileSize || fileSize <= 0) {
          port.postMessage({ type: "ERROR", error: "File size is unavailable for streaming" });
          return;
        }

        const isMediaStream =
          resolvedFile.category === "VIDEO" ||
          resolvedFile.category === "AUDIO" ||
          resolvedFile.mimeType?.startsWith("video/") ||
          resolvedFile.mimeType?.startsWith("audio/");

        const initialWindow = supportsStreaming ? INITIAL_STREAM_WINDOW_BYTES : 512 * 1024;
        const steadyWindow = supportsStreaming ? MEDIA_STREAM_WINDOW_BYTES : 1024 * 1024;

        let start = 0;
        let end =
          !range && !isMediaStream && fileSize <= FULL_DOC_MAX_BYTES
            ? fileSize - 1
            : Math.min(fileSize - 1, initialWindow - 1);

        if (range) {
          // Case A: Suffix range request (e.g. Range: bytes=-524288 for moov atom at EOF)
          const suffixMatch = range.match(/bytes=-(\d+)/i);
          if (suffixMatch) {
            const suffixLength = Math.min(parseInt(suffixMatch[1], 10), steadyWindow);
            start = Math.max(0, fileSize - suffixLength);
            end = fileSize - 1;
          } else {
            // Case B: Standard range (e.g. bytes=0-, bytes=0-1, bytes=1048576-, bytes=0-50000000)
            const rangeMatch = range.match(/bytes=(\d+)-(\d+)?/i);
            if (rangeMatch) {
              start = parseInt(rangeMatch[1], 10);
              const maxWindow = start === 0 ? initialWindow : steadyWindow;

              if (rangeMatch[2]) {
                const requestedEnd = Math.min(fileSize - 1, parseInt(rangeMatch[2], 10));
                const requestedSpan = requestedEnd - start + 1;
                if (requestedSpan <= SMALL_PROBE_BYTES) {
                  end = requestedEnd;
                } else {
                  end = Math.min(requestedEnd, start + maxWindow - 1);
                }
              } else {
                end = Math.min(fileSize - 1, start + maxWindow - 1);
              }
            }
          }
        }

        if (start >= fileSize) {
          port.postMessage(
            supportsStreaming
              ? {
                  type: "HEADERS",
                  status: 416,
                  headers: { "Content-Range": `bytes */${fileSize}` },
                  firstChunk: new ArrayBuffer(0),
                  done: true,
                }
              : {
                  status: 416,
                  headers: { "Content-Range": `bytes */${fileSize}` },
                  body: new ArrayBuffer(0),
                }
          );
          return;
        }

        const requestLength = Math.max(0, end - start + 1);
        if (requestLength <= 0) {
          port.postMessage(
            supportsStreaming
              ? {
                  type: "HEADERS",
                  status: 416,
                  headers: { "Content-Range": `bytes */${fileSize}` },
                  firstChunk: new ArrayBuffer(0),
                  done: true,
                }
              : {
                  status: 416,
                  headers: { "Content-Range": `bytes */${fileSize}` },
                  body: new ArrayBuffer(0),
                }
          );
          return;
        }

        // Legacy Service Worker fallback (before updated sw.js takes control)
        if (!supportsStreaming) {
          const payload = await getOrCreateReader().readRange(
            start,
            requestLength,
            rangeAbortController.signal
          );
          if (!payload || payload.byteLength === 0) {
            throw new Error("Empty range payload received from Telegram");
          }
          const exactBuffer = toTransferableBuffer(payload);
          const responseEnd = start + payload.byteLength - 1;
          const isPartial = Boolean(range) || payload.byteLength < fileSize;
          headersSent = true;
          port.postMessage(
            {
              status: isPartial ? 206 : 200,
              headers: {
                ...(isPartial ? { "Content-Range": `bytes ${start}-${responseEnd}/${fileSize}` } : {}),
                "Content-Length": String(payload.byteLength),
                "Content-Type": resolvedFile.mimeType || "video/mp4",
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-cache",
              },
              body: exactBuffer,
            },
            [exactBuffer]
          );
          return;
        }

        const subRequests = splitTelegramRange(start, requestLength, fileSize);
        if (subRequests.length === 0) {
          port.postMessage({ type: "ERROR", error: "Empty stream range" });
          return;
        }

        const dcLabel = formatDcLabel(reader.getDcId());
        console.info(
          `[StreamBridge] Streaming [${start}-${end}] (${(requestLength / 1048576).toFixed(2)} MiB, ${subRequests.length} chunks) for "${resolvedFile.name}" on ${dcLabel}`
        );

        // Fetch first chunk (<= 512 KiB) before committing HTTP headers so TTFB stays minimal
        // and any initial error/abort can still return a clean HTTP status.
        const firstSlice = await fetchSubWithRetry(
          getOrCreateReader,
          subRequests[0],
          requestLength,
          resolvedFile.id,
          resolvedFile.name,
          rangeAbortController.signal
        );

        if (!firstSlice || firstSlice.byteLength === 0) {
          throw new Error("Empty range payload received from Telegram");
        }

        // If Telegram hit EOF inside the first chunk (single-chunk or slightly overestimated size)
        const isShortFirstChunk = firstSlice.byteLength < subRequests[0].logicalLength;
        const singleChunkDone = subRequests.length === 1 || isShortFirstChunk;
        const declaredLength = singleChunkDone ? firstSlice.byteLength : requestLength;
        const responseEnd = start + declaredLength - 1;
        const isPartial = Boolean(range) || declaredLength < fileSize;

        const firstBuffer = toTransferableBuffer(firstSlice);
        headersSent = true;

        port.postMessage(
          {
            type: "HEADERS",
            status: isPartial ? 206 : 200,
            headers: {
              ...(isPartial
                ? { "Content-Range": `bytes ${start}-${responseEnd}/${fileSize}` }
                : {}),
              "Content-Length": String(declaredLength),
              "Content-Type": resolvedFile.mimeType || "video/mp4",
              "Accept-Ranges": "bytes",
              "Cache-Control": "no-cache",
            },
            firstChunk: firstBuffer,
            done: singleChunkDone,
          },
          [firstBuffer]
        );

        if (singleChunkDone) {
          return;
        }

        // Stream remaining 512 KiB chunks on demand as the browser's ReadableStream pulls
        for (let i = 1; i < subRequests.length; i++) {
          const shouldContinue = await waitForPull();
          if (
            !shouldContinue ||
            rangeAbortController.signal.aborted ||
            !activeStreamFiles.has(resolvedFile.id)
          ) {
            return;
          }

          const sub = subRequests[i];
          const chunkSlice = await fetchSubWithRetry(
            getOrCreateReader,
            sub,
            requestLength,
            resolvedFile.id,
            resolvedFile.name,
            rangeAbortController.signal
          );

          if (rangeAbortController.signal.aborted || !activeStreamFiles.has(resolvedFile.id)) {
            return;
          }

          if (!chunkSlice || chunkSlice.byteLength === 0) {
            port.postMessage({ type: "ERROR", error: "Unexpected EOF from Telegram stream" });
            return;
          }

          const chunkBuffer = toTransferableBuffer(chunkSlice);
          const isLast = i === subRequests.length - 1;

          port.postMessage(
            {
              type: "CHUNK",
              body: chunkBuffer,
              done: isLast,
            },
            [chunkBuffer]
          );
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("ABORTED") || rangeAbortController.signal.aborted) {
          if (!headersSent) {
            try {
              port.postMessage({ type: "ERROR", error: "ABORTED" });
            } catch {}
          }
          return;
        }
        console.error("[StreamBridge] Error streaming range:", msg);
        try {
          port.postMessage({ type: "ERROR", error: msg });
        } catch {}
      } finally {
        rangeAbortController.abort();
        port.onmessage = null;
      }
    });
  } catch (bridgeErr) {
    console.error("[StreamBridge] Failed to initialize stream bridge safely:", bridgeErr);
  }
}
