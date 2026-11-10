import { TelegramClient } from "telegram";
import { useDriveStore } from "@/lib/stores/drive-store";
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

        // 1. Locate file metadata from active cache, Zustand store, or dialogs
        let file = activeStreamFiles.get(fileId) || useDriveStore.getState().files.find((f) => f.id === fileId);

        if (!file) {
          // Attempt fuzzy match on messageId / channelId
          file = Array.from(activeStreamFiles.values()).find((f) => f.id.endsWith(fileId) || fileId.endsWith(f.id));
        }

        if (!file) {
          port.postMessage({ error: `File with ID "${fileId}" not found in catalog` });
          return;
        }

        let reader = readerCache.get(file.id);
        if (!reader) {
          reader = new TelegramRangeReader(client, file);
          readerCache.set(file.id, reader);
        }

        const fileSize = file.size;
        let start = 0;
        let end = fileSize - 1;
        const TARGET_CHUNK_SIZE = 512 * 1024; // 512 KiB per range response for fast first-frame start

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
                // Open-ended range: limit to TARGET_CHUNK_SIZE to minimize round-trip latency
                end = Math.min(fileSize - 1, start + TARGET_CHUNK_SIZE - 1);
              }
            }
          }
        } else {
          end = Math.min(fileSize - 1, TARGET_CHUNK_SIZE - 1);
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

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            payload = await reader.readRange(start, requestLength);
            break;
          } catch (err: any) {
            lastErr = err;
            console.warn(
              `[StreamBridge] Range fetch attempt ${attempt + 1}/3 failed for ${file.name} [${start}-${end}]:`,
              err?.message || err
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
