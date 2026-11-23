import { TelegramClient } from "teleproto";
import { DriveFile } from "@/lib/telegram/indexer";
import { TelegramRangeReader } from "@/lib/telegram/streaming/telegram-range-reader";
import { refreshFileLocation } from "@/lib/telegram/media-refresher";

const readerCache = new Map<string, TelegramRangeReader>();
const activeStreamFiles = new Map<string, DriveFile>();

// Cap every single HTTP 206 ServiceWorker response to keep TTFB fast and prevent
// browser/SW timeouts on high-latency transatlantic DCs (e.g. Pluto DC 1).
const OPEN_RANGE_BATCH_BYTES = 512 * 1024; // 512 KiB for open-ended / initial probe
const MAX_EXPLICIT_RANGE_BYTES = 1024 * 1024; // 1 MiB ceiling even if browser requests 0-<huge>

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
      })
      .catch((err) => {
        console.warn("[StreamBridge] ServiceWorker registration deferred:", err);
      });

    navigator.serviceWorker.addEventListener("message", async (event) => {
      if (event.data?.type !== "VAULTGRAM_STREAM_REQUEST") return;

      const { fileId, range } = event.data;
      const port: MessagePort = event.ports[0];
      if (!port) return;

      const rangeAbortController = new AbortController();
      port.onmessage = (msgEvent) => {
        if (msgEvent.data?.type === "ABORT") {
          rangeAbortController.abort();
        }
      };

      try {
        const client = getClient();
        if (!client) {
          port.postMessage({ error: "Telegram MTProto client is not available or disconnected" });
          return;
        }

        // 1. Locate file metadata strictly from active stream files
        let file = activeStreamFiles.get(fileId);
        if (!file) {
          file = Array.from(activeStreamFiles.values()).find(
            (f) => f.id.endsWith(fileId) || fileId.endsWith(f.id)
          );
        }

        // If file is no longer active (user closed player or switched video), immediately abort
        if (!file) {
          port.postMessage({ error: "ABORTED" });
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

        let reader = readerCache.get(file.id);
        if (!reader || (reader as any).isDestroyed) {
          reader = new TelegramRangeReader(client, file);
          readerCache.set(file.id, reader);
        }

        const fileSize = reader.getFileSize() || file.size;
        if (!fileSize || fileSize <= 0) {
          port.postMessage({ error: "File size is unavailable for streaming" });
          return;
        }

        const isMediaStream =
          file.category === "VIDEO" ||
          file.category === "AUDIO" ||
          file.mimeType?.startsWith("video/") ||
          file.mimeType?.startsWith("audio/");

        let start = 0;
        let end = !range && !isMediaStream && fileSize <= 25 * 1024 * 1024
          ? fileSize - 1
          : Math.min(fileSize - 1, OPEN_RANGE_BATCH_BYTES - 1);

        if (range) {
          // Case A: Suffix range request (e.g. Range: bytes=-524288 for moov atom at EOF)
          const suffixMatch = range.match(/bytes=-(\d+)/i);
          if (suffixMatch) {
            const suffixLength = Math.min(parseInt(suffixMatch[1], 10), MAX_EXPLICIT_RANGE_BYTES);
            start = Math.max(0, fileSize - suffixLength);
            end = fileSize - 1;
          } else {
            // Case B: Standard range (e.g. Range: bytes=0-, bytes=0-1, bytes=0-50000000)
            const rangeMatch = range.match(/bytes=(\d+)-(\d+)?/i);
            if (rangeMatch) {
              start = parseInt(rangeMatch[1], 10);
              if (rangeMatch[2]) {
                const requestedEnd = Math.min(fileSize - 1, parseInt(rangeMatch[2], 10));
                // Honor small explicit probes exactly (e.g. Safari bytes=0-1),
                // but cap oversized explicit ranges so a single 206 never exceeds 1 MiB.
                const cap = start === 0 && requestedEnd > OPEN_RANGE_BATCH_BYTES
                  ? OPEN_RANGE_BATCH_BYTES
                  : MAX_EXPLICIT_RANGE_BYTES;
                end = Math.min(requestedEnd, start + cap - 1);
              } else {
                end = Math.min(fileSize - 1, start + OPEN_RANGE_BATCH_BYTES - 1);
              }
            }
          }
        }

        if (start >= fileSize) {
          port.postMessage({
            status: 416,
            headers: {
              "Content-Range": `bytes */${fileSize}`,
            },
            body: new ArrayBuffer(0),
          });
          return;
        }

        const requestLength = Math.max(0, end - start + 1);
        if (requestLength <= 0) {
          port.postMessage({
            status: 416,
            headers: {
              "Content-Range": `bytes */${fileSize}`,
            },
            body: new ArrayBuffer(0),
          });
          return;
        }

        const activeDcId = reader.getDcId();
        const dcLabel =
          activeDcId === 1
            ? "Pluto (DC 1)"
            : activeDcId === 2
            ? "Venus (DC 2)"
            : activeDcId === 3
            ? "Aurora (DC 3)"
            : activeDcId === 4
            ? "Vesta (DC 4)"
            : activeDcId === 5
            ? "Flora (DC 5)"
            : `DC ${activeDcId || "default"}`;
        console.info(`[StreamBridge] Range fetch [${start}-${end}] for "${file.name}" on ${dcLabel}`);

        // Perform MTProto range fetch with brief retry on transient hiccups
        let payload: Uint8Array | null = null;
        let lastErr: unknown = null;

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            if (!activeStreamFiles.has(file.id) || rangeAbortController.signal.aborted) {
              throw new Error("ABORTED");
            }
            if ((reader as any).isDestroyed) {
              reader = new TelegramRangeReader(client, file);
              readerCache.set(file.id, reader);
            }
            payload = await reader.readRange(start, requestLength, rangeAbortController.signal);
            break;
          } catch (err: any) {
            lastErr = err;
            const errMsg = String(err?.message || err);
            if (
              errMsg.includes("ABORTED") ||
              !activeStreamFiles.has(file.id) ||
              rangeAbortController.signal.aborted
            ) {
              port.postMessage({ error: "ABORTED" });
              return;
            }
            console.warn(
              `[StreamBridge] Range fetch attempt ${attempt + 1}/2 failed for ${file.name} [${start}-${end}] on ${dcLabel}:`,
              errMsg
            );
            if (attempt < 1) {
              await new Promise((resolve) => setTimeout(resolve, 350));
            }
          }
        }

        if (!payload || payload.byteLength === 0) {
          throw lastErr || new Error("Empty range payload received from Telegram");
        }

        // Extract exact ArrayBuffer slice for zero-copy transfer to Service Worker
        const exactBuffer = payload.buffer.slice(
          payload.byteOffset,
          payload.byteOffset + payload.byteLength
        );

        const responseStart = start;
        const responseEnd = start + payload.byteLength - 1;
        const isPartial = Boolean(range) || payload.byteLength < fileSize;

        port.postMessage(
          {
            status: isPartial ? 206 : 200,
            headers: {
              ...(isPartial ? { "Content-Range": `bytes ${responseStart}-${responseEnd}/${fileSize}` } : {}),
              "Content-Length": String(payload.byteLength),
              "Content-Type": file.mimeType || "video/mp4",
              "Accept-Ranges": "bytes",
              "Cache-Control": "no-cache",
            },
            body: exactBuffer,
          },
          [exactBuffer]
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[StreamBridge] Error streaming range:", msg);
        port.postMessage({ error: msg });
      } finally {
        port.onmessage = null;
      }
    });
  } catch (bridgeErr) {
    console.error("[StreamBridge] Failed to initialize stream bridge safely:", bridgeErr);
  }
}
