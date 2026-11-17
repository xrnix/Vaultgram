import { TelegramClient } from "teleproto";
import { DriveFile } from "@/lib/telegram/indexer";
import { TelegramRangeReader } from "@/lib/telegram/streaming/telegram-range-reader";

const readerCache = new Map<string, TelegramRangeReader>();
const activeStreamFiles = new Map<string, DriveFile>();

export function registerActiveStreamFile(file: DriveFile) {
  if (file && file.id) {
    activeStreamFiles.set(file.id, file);
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
      new Promise<null>((r) => setTimeout(() => r(null), 1000)),
    ]);
    await readyWithTimeout;
    if (navigator.serviceWorker.controller) return true;

    // Wait up to 800ms for clients.claim() controller change
    return await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        resolve(!!navigator.serviceWorker.controller);
      }, 800);

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

      try {
        const client = getClient();
        if (!client) {
          port.postMessage({ error: "Telegram MTProto client is not available or disconnected" });
          return;
        }

        // 1. Locate file metadata strictly from active stream files
        let file = activeStreamFiles.get(fileId);

        if (!file) {
          // Attempt fuzzy match on messageId / channelId within active files
          file = Array.from(activeStreamFiles.values()).find((f) => f.id.endsWith(fileId) || fileId.endsWith(f.id));
        }

        // If file is no longer active (user closed player or switched video), immediately abort without querying MTProto
        if (!file) {
          port.postMessage({ error: "ABORTED" });
          return;
        }

        let reader = readerCache.get(file.id);
        if (!reader || (reader as any).isDestroyed) {
          reader = new TelegramRangeReader(client, file);
          readerCache.set(file.id, reader);
        }

        const fileSize = file.size;
        let start = 0;
        let end = fileSize - 1;
        if (range) {
          // Case A: Suffix range request (e.g. Range: bytes=-524288 for moov atom at EOF)
          const suffixMatch = range.match(/bytes=-(\d+)/i);
          if (suffixMatch) {
            const suffixLength = parseInt(suffixMatch[1], 10);
            start = Math.max(0, fileSize - suffixLength);
            end = fileSize - 1;
          } else {
            // Case B: Standard range (e.g. Range: bytes=0- or bytes=0-1024 or bytes=1048576-)
            const rangeMatch = range.match(/bytes=(\d+)-(\d+)?/i);
            if (rangeMatch) {
              start = parseInt(rangeMatch[1], 10);
              if (rangeMatch[2]) {
                end = Math.min(fileSize - 1, parseInt(rangeMatch[2], 10));
              } else {
                // Open-ended range: 512 KiB per batch to guarantee rapid TTFB and prevent
                // transatlantic 45s ServiceWorker timeouts on high-latency DCs (e.g. Pluto DC 1).
                const targetBatchSize = 512 * 1024;
                end = Math.min(fileSize - 1, start + targetBatchSize - 1);
              }
            }
          }
        } else {
          end = Math.min(fileSize - 1, 512 * 1024 - 1);
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

        // Perform MTProto range fetch with transparent jitter retry
        let payload: Uint8Array | null = null;
        let lastErr: any = null;

        const rangeAbortController = new AbortController();
        port.onmessage = (event) => {
          if (event.data?.type === "ABORT") {
            rangeAbortController.abort();
          }
        };

        for (let attempt = 0; attempt < 3; attempt++) {
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
            // On ABORTED or when stream file is no longer registered, exit immediately without retries
            if (errMsg.includes("ABORTED") || !activeStreamFiles.has(file.id) || rangeAbortController.signal.aborted) {
              port.postMessage({ error: "ABORTED" });
              return;
            }
            console.warn(
              `[StreamBridge] Range fetch attempt ${attempt + 1}/3 failed for ${file.name} [${start}-${end}]:`,
              errMsg
            );
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        }

        if (!payload) {
          throw lastErr || new Error("Failed to fetch range after 3 attempts");
        }

        // Accurately extract sliced ArrayBuffer without offset mismatch
        const exactBuffer = payload.buffer.slice(
          payload.byteOffset,
          payload.byteOffset + payload.byteLength
        );

        const responseStart = start;
        const responseEnd = start + payload.byteLength - 1;

        port.postMessage(
          {
            status: range ? 206 : 200,
            headers: {
              "Content-Range": `bytes ${responseStart}-${responseEnd}/${fileSize}`,
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
      }
    });
  } catch (bridgeErr) {
    console.error("[StreamBridge] Failed to initialize stream bridge safely:", bridgeErr);
  }
}
