import * as pdfjsLib from "pdfjs-dist";
import { DriveFile } from "@/lib/telegram/indexer";
import { tgStreamClient } from "@/lib/telegram/client";
import { registerActiveStreamFile } from "@/lib/stream/stream-bridge";

// Set worker source using Vite's URL asset resolution
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
}

export { pdfjsLib };

export interface PdfLoadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export type PdfProgressCallback = (progress: PdfLoadProgress) => void;

/**
 * Loads a PDF document using Mozilla PDF.js from Telegram MTProto or stream bridge.
 */
export async function loadPdfFromTelegram(
  file: DriveFile,
  onProgress?: PdfProgressCallback
): Promise<pdfjsLib.PDFDocumentProxy> {
  registerActiveStreamFile(file);
  const streamUrl = `/stream/${encodeURIComponent(file.id)}`;

  // If Service Worker is actively controlling the page and file is large (> 25MB),
  // stream directly via Range requests
  if (file.size > 25 * 1024 * 1024 && navigator.serviceWorker?.controller) {
    const loadingTask = pdfjsLib.getDocument({
      url: streamUrl,
      withCredentials: false,
      rangeChunkSize: 512 * 1024,
    });

    if (onProgress) {
      loadingTask.onProgress = (progressData: { loaded: number; total: number }) => {
        const { loaded, total } = progressData;
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        onProgress({ loaded, total, percent });
      };
    }

    return await loadingTask.promise;
  }

  // For fast, local documents (<= 25MB), download via Telegram MTProto or fetch
  try {
    // Attempt 1: Fetch via Stream Bridge ServiceWorker
    if (navigator.serviceWorker?.controller) {
      const response = await fetch(streamUrl);
      if (response.ok) {
        const contentLength = Number(response.headers.get("Content-Length")) || file.size;
        const reader = response.body?.getReader();

        if (reader) {
          const chunks: Uint8Array[] = [];
          let received = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              received += value.byteLength;
              if (onProgress) {
                const percent = contentLength > 0 ? Math.round((received / contentLength) * 100) : 0;
                onProgress({ loaded: received, total: contentLength, percent });
              }
            }
          }

          const combined = new Uint8Array(received);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.byteLength;
          }

          return await pdfjsLib.getDocument({ data: combined }).promise;
        }
      }
    }
  } catch (err) {
    console.warn("[PdfLoader] Stream fetch fallback to direct MTProto download:", err);
  }

  // Attempt 2: Direct Telegram Client downloadMedia
  const client = tgStreamClient.client;
  if (!client) {
    throw new Error("Telegram MTProto client is not connected.");
  }

  // Resolve message/media entity
  let channelEntity: any = null;
  try {
    channelEntity = await client.getEntity(parseInt(file.channelId, 10));
  } catch {
    const dialogs = await client.getDialogs();
    for (const d of dialogs) {
      if (d.entity && String(d.entity.id) === file.channelId) {
        channelEntity = d.entity;
        break;
      }
    }
  }

  if (!channelEntity) {
    throw new Error(`Channel ${file.channelTitle || file.channelId} could not be resolved.`);
  }

  const messages = await client.getMessages(channelEntity, { ids: [file.messageId] });
  if (!messages || !messages[0] || !messages[0].media) {
    throw new Error("PDF document message not found on Telegram.");
  }

  const media = messages[0].media;
  let totalDownloaded = 0;
  const buffer = await client.downloadMedia(media, {
    progressCallback: (downloaded: any, total: any) => {
      totalDownloaded = Number(downloaded);
      const tot = Number(total) || file.size;
      const percent = tot > 0 ? Math.round((totalDownloaded / tot) * 100) : 0;
      if (onProgress) {
        onProgress({ loaded: totalDownloaded, total: tot, percent });
      }
    },
  });

  if (!buffer) {
    throw new Error("Empty PDF buffer received from Telegram.");
  }

  const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as ArrayBuffer);
  return await pdfjsLib.getDocument({ data: uint8 }).promise;
}
