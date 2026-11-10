import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import JSZip from "jszip";
import {
  X,
  Archive,
  Download,
  Folder,
  File,
  FileText,
  FileCode,
  Image as ImageIcon,
  Music,
  Video as VideoIcon,
  Search,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { DriveFile } from "@/lib/telegram/indexer";
import { tgStreamClient } from "@/lib/telegram/client";
import { registerActiveStreamFile, unregisterActiveStreamFile } from "@/lib/stream/stream-bridge";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";

interface ArchiveEntry {
  path: string;
  name: string;
  isDir: boolean;
  size: number;
  compressedSize: number;
  date: Date;
  fileObj: JSZip.JSZipObject;
}

interface ArchiveViewerModalProps {
  file: DriveFile | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadFullArchive: (file: DriveFile) => void;
}

export const ArchiveViewerModal: React.FC<ArchiveViewerModalProps> = ({
  file,
  isOpen,
  onClose,
  onDownloadFullArchive,
}) => {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [downloadProgress, setDownloadProgress] = useState<{ loaded: number; total: number; percent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCopiedRef, setIsCopiedRef] = useState(false);

  // Preview of an individual file inside the archive
  const [previewEntry, setPreviewEntry] = useState<{
    entry: ArchiveEntry;
    text?: string;
    blobUrl?: string;
    isLoading: boolean;
  } | null>(null);

  const loadArchive = useCallback(async () => {
    if (!file) return;
    registerActiveStreamFile(file);
    setIsLoading(true);
    setError(null);
    setEntries([]);
    setPreviewEntry(null);
    setDownloadProgress(null);

    try {
      const streamUrl = `/stream/${encodeURIComponent(file.id)}`;
      let buffer: Uint8Array | null = null;

      // 1. Try Stream Bridge fetch
      if (navigator.serviceWorker?.controller) {
        try {
          const res = await fetch(streamUrl);
          if (res.ok) {
            const contentLength = Number(res.headers.get("Content-Length")) || file.size;
            const reader = res.body?.getReader();
            if (reader) {
              const chunks: Uint8Array[] = [];
              let received = 0;
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                  chunks.push(value);
                  received += value.byteLength;
                  const percent = contentLength > 0 ? Math.round((received / contentLength) * 100) : 0;
                  setDownloadProgress({ loaded: received, total: contentLength, percent });
                }
              }
              const combined = new Uint8Array(received);
              let offset = 0;
              for (const chunk of chunks) {
                combined.set(chunk, offset);
                offset += chunk.byteLength;
              }
              buffer = combined;
            }
          }
        } catch (fetchErr) {
          console.warn("[ArchiveViewer] Stream fetch failed, falling back to MTProto download:", fetchErr);
        }
      }

      // 2. Fallback to Telegram Client downloadMedia
      if (!buffer) {
        const client = tgStreamClient.client;
        if (!client) throw new Error("Telegram MTProto client is not connected.");

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

        if (!channelEntity) throw new Error("Channel entity could not be resolved.");

        const messages = await client.getMessages(channelEntity, { ids: [file.messageId] });
        if (!messages || !messages[0] || !messages[0].media) {
          throw new Error("Archive file message not found on Telegram.");
        }

        const raw = await client.downloadMedia(messages[0].media, {
          progressCallback: (downloaded: any, total: any) => {
            const cur = Number(downloaded);
            const tot = Number(total) || file.size;
            const percent = tot > 0 ? Math.round((cur / tot) * 100) : 0;
            setDownloadProgress({ loaded: cur, total: tot, percent });
          },
        });

        if (!raw) throw new Error("Empty archive payload received.");
        buffer = raw instanceof Uint8Array ? raw : new Uint8Array(raw as ArrayBuffer);
      }

      // 3. Parse Archive via JSZip
      const zip = await JSZip.loadAsync(buffer);
      const parsedEntries: ArchiveEntry[] = [];

      zip.forEach((relativePath, zipEntry) => {
        const isDir = zipEntry.dir || relativePath.endsWith("/");
        const parts = relativePath.split("/").filter(Boolean);
        const name = parts[parts.length - 1] || relativePath;

        // JSZip internal metadata
        const uncompressed = (zipEntry as any)._data?.uncompressedSize || 0;
        const compressed = (zipEntry as any)._data?.compressedSize || 0;

        parsedEntries.push({
          path: relativePath,
          name,
          isDir,
          size: uncompressed,
          compressedSize: compressed,
          date: zipEntry.date,
          fileObj: zipEntry,
        });
      });

      // Sort: folders first, then alphabetically
      parsedEntries.sort((a, b) => {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
        return a.path.localeCompare(b.path);
      });

      setEntries(parsedEntries);
      setIsLoading(false);
    } catch (err: unknown) {
      console.error("[ArchiveViewer] Error loading archive:", err);
      const msg = err instanceof Error ? err.message : "Failed to read compressed archive.";
      setError(msg);
      setIsLoading(false);
    }
  }, [file]);

  useEffect(() => {
    if (isOpen && file) {
      loadArchive();
    } else {
      setEntries([]);
      setPreviewEntry(null);
    }

    return () => {
      if (file) unregisterActiveStreamFile(file.id);
    };
  }, [isOpen, file, loadArchive]);

  // Clean up blob URLs when previewEntry unmounts
  useEffect(() => {
    return () => {
      if (previewEntry?.blobUrl) {
        URL.revokeObjectURL(previewEntry.blobUrl);
      }
    };
  }, [previewEntry]);

  // Keyboard listener: Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        if (previewEntry) {
          setPreviewEntry(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, previewEntry, onClose]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase().trim();
    return entries.filter(
      (e) => e.path.toLowerCase().includes(q) || e.name.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  const totalUncompressed = useMemo(
    () => entries.reduce((acc, curr) => acc + (curr.isDir ? 0 : curr.size), 0),
    [entries]
  );

  const getFileIcon = (entry: ArchiveEntry) => {
    if (entry.isDir) return <Folder className="w-4 h-4 text-zinc-400 stroke-[1.5px]" />;
    const ext = entry.name.split(".").pop()?.toLowerCase() || "";
    if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-zinc-300 stroke-[1.5px]" />;
    }
    if (["mp3", "wav", "m4a", "flac", "ogg", "aac"].includes(ext)) {
      return <Music className="w-4 h-4 text-zinc-300 stroke-[1.5px]" />;
    }
    if (["mp4", "webm", "mkv", "mov"].includes(ext)) {
      return <VideoIcon className="w-4 h-4 text-zinc-300 stroke-[1.5px]" />;
    }
    if (["json", "js", "ts", "jsx", "tsx", "py", "rs", "go", "html", "css", "yaml", "yml"].includes(ext)) {
      return <FileCode className="w-4 h-4 text-zinc-300 stroke-[1.5px]" />;
    }
    if (["txt", "md", "csv", "log", "pdf"].includes(ext)) {
      return <FileText className="w-4 h-4 text-zinc-300 stroke-[1.5px]" />;
    }
    return <File className="w-4 h-4 text-zinc-400 stroke-[1.5px]" />;
  };

  // Preview an individual file inside the zip
  const handlePreviewFile = async (entry: ArchiveEntry) => {
    if (entry.isDir) return;
    const ext = entry.name.split(".").pop()?.toLowerCase() || "";
    setPreviewEntry({ entry, isLoading: true });

    try {
      if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext)) {
        const blob = await entry.fileObj.async("blob");
        const blobUrl = URL.createObjectURL(blob);
        setPreviewEntry({ entry, blobUrl, isLoading: false });
      } else if (
        ["txt", "md", "json", "js", "ts", "html", "css", "py", "rs", "go", "yaml", "yml", "xml", "csv", "log"].includes(ext) ||
        entry.size < 500 * 1024
      ) {
        const text = await entry.fileObj.async("string");
        setPreviewEntry({ entry, text: text.slice(0, 100000), isLoading: false });
      } else {
        toast.info("Binary file. Use direct download button to inspect.");
        setPreviewEntry(null);
      }
    } catch (err: any) {
      toast.error("Failed to decode entry for preview.");
      setPreviewEntry(null);
    }
  };

  // Selective single-file extraction & download
  const handleExtractSingle = async (e: React.MouseEvent, entry: ArchiveEntry) => {
    e.stopPropagation();
    if (entry.isDir) return;

    try {
      toast.info(`Extracting ${entry.name}...`);
      const blob = await entry.fileObj.async("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = entry.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Extracted ${entry.name}`);
    } catch (err: any) {
      toast.error(`Failed to extract ${entry.name}`);
    }
  };

  const copyReference = () => {
    if (!file) return;
    const text = `Channel: ${file.channelTitle} (ID: ${file.channelId}), Msg: ${file.messageId}`;
    navigator.clipboard.writeText(text);
    setIsCopiedRef(true);
    toast.success("Telegram message reference copied");
    setTimeout(() => setIsCopiedRef(false), 2000);
  };

  if (!isOpen || !file) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="relative z-10 flex flex-col w-full max-w-5xl h-[92vh] sm:h-[88vh] bg-[#121215] border border-white/[0.1] rounded-[8px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden backdrop-blur-2xl"
        >
          {/* Top Hairline Sheen */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.08] bg-[#121215]/95 shrink-0">
            <div className="flex items-center gap-3 min-w-0 mr-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white/[0.04] border border-white/[0.08] text-[#e6cfa3] shrink-0">
                <Archive className="h-4.5 w-4.5 stroke-[1.5px]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-medium font-sans text-white truncate">
                    {file.name}
                  </h2>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#e6cfa3] bg-[#c49b56]/15 border border-[#c49b56]/30 px-2 py-0.5 rounded-[3px] shrink-0">
                    Archive Explorer
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 font-mono truncate flex items-center gap-2 mt-0.5">
                  <span>Compressed: {formatBytes(file.size)}</span>
                  <span>•</span>
                  <span>Uncompressed: {formatBytes(totalUncompressed)}</span>
                  <span>•</span>
                  <span>{entries.length} items</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => onDownloadFullArchive(file)}
                className="h-8 px-3.5 text-xs rounded-[6px] bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.12] gap-2 active:scale-[0.98] transition-all"
              >
                <Download className="w-3.5 h-3.5 stroke-[1.5px]" />
                <span className="hidden sm:inline">Download Archive</span>
              </Button>

              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-[4px] transition-colors ml-1"
                title="Close (Esc)"
              >
                <X className="w-4 h-4 stroke-[1.5px]" />
              </button>
            </div>
          </div>

          {/* Sub-toolbar: Search within Archive */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-2.5 border-b border-white/[0.06] bg-[#0d0d10] text-xs shrink-0">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search files inside archive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 font-mono text-xs bg-white/[0.03] border border-white/[0.08] rounded-[6px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="text-[11px] font-mono text-zinc-500 hidden sm:block">
              Click any file to preview or extract individually
            </div>
          </div>

          {/* Main Stage */}
          <div className="relative flex flex-1 overflow-hidden bg-[#09090b]">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400 bg-[#09090b]/80 backdrop-blur-sm z-20">
                <div className="flex h-10 w-10 items-center justify-center rounded-[5px] bg-white/[0.04] border border-white/[0.08] shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
                </div>
                <div className="space-y-1.5 text-center max-w-xs">
                  <span className="text-xs font-mono text-zinc-200 block">
                    Decompressing Archive Catalog
                  </span>
                  {downloadProgress ? (
                    <div className="space-y-1">
                      <div className="w-48 h-1 bg-white/[0.08] rounded-full overflow-hidden mx-auto">
                        <div
                          className="h-full bg-white transition-all duration-150"
                          style={{ width: `${downloadProgress.percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {downloadProgress.percent}% ({formatBytes(downloadProgress.loaded)} / {formatBytes(downloadProgress.total)})
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-500">Fetching archive bytes via MTProto...</span>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
                <AlertCircle className="w-8 h-8 text-rose-400" />
                <div className="space-y-1 max-w-sm">
                  <span className="text-sm font-medium text-white block">Archive Decoding Error</span>
                  <p className="text-xs text-zinc-400 leading-relaxed">{error}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadArchive}
                  className="text-xs h-8 rounded-[4px] border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Archive Load</span>
                </Button>
              </div>
            )}

            {/* Archive Files Table */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-0.5">
              {filteredEntries.length === 0 && !isLoading && !error ? (
                <div className="py-16 text-center text-xs text-zinc-500 font-mono">
                  No files matched your search query inside this archive.
                </div>
              ) : (
                filteredEntries.map((entry) => (
                  <div
                    key={entry.path}
                    onClick={() => handlePreviewFile(entry)}
                    className={`group flex items-center justify-between p-2.5 px-3.5 rounded-[5px] border border-transparent transition-all ${
                      entry.isDir
                        ? "text-zinc-400 hover:bg-white/[0.02]"
                        : "text-zinc-200 hover:bg-white/[0.04] hover:border-white/[0.08] cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 mr-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-white/[0.03] border border-white/[0.06] shrink-0 text-zinc-400">
                        {getFileIcon(entry)}
                      </div>
                      <span className="text-xs font-mono truncate">{entry.path}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500 shrink-0">
                      {!entry.isDir && (
                        <>
                          <span className="tabular-nums text-zinc-400">{formatBytes(entry.size)}</span>
                          <button
                            onClick={(e) => handleExtractSingle(e, entry)}
                            className="p-1.5 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-[4px] opacity-0 group-hover:opacity-100 transition-opacity"
                            title={`Extract ${entry.name}`}
                          >
                            <Download className="w-3.5 h-3.5 stroke-[1.5px]" />
                          </button>
                        </>
                      )}
                      {entry.isDir && <span className="text-[10px] text-zinc-600">FOLDER</span>}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* In-Modal File Preview Drawer (for text/images inside the archive) */}
            {previewEntry && (
              <div className="w-full sm:w-1/2 border-l border-white/[0.08] bg-[#0c0c0f] flex flex-col z-10 shrink-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#121215]">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-[#e6cfa3] shrink-0" />
                    <span className="text-xs font-mono text-white truncate font-medium">
                      {previewEntry.entry.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleExtractSingle(e, previewEntry.entry)}
                      className="p-1.5 text-zinc-400 hover:text-white rounded-[4px] hover:bg-white/[0.06] transition-colors"
                      title="Extract file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPreviewEntry(null)}
                      className="p-1.5 text-zinc-400 hover:text-white rounded-[4px] hover:bg-white/[0.06] transition-colors"
                      title="Close preview"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4 text-xs font-mono bg-[#09090b]">
                  {previewEntry.isLoading ? (
                    <div className="py-12 flex justify-center items-center text-zinc-500">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span>Extracting preview...</span>
                    </div>
                  ) : previewEntry.blobUrl ? (
                    <div className="flex items-center justify-center h-full">
                      <img
                        src={previewEntry.blobUrl}
                        alt={previewEntry.entry.name}
                        className="max-h-[50vh] object-contain rounded-[3px] shadow-lg border border-white/[0.08]"
                      />
                    </div>
                  ) : previewEntry.text !== undefined ? (
                    <pre className="text-zinc-300 whitespace-pre-wrap leading-relaxed select-all">
                      {previewEntry.text}
                    </pre>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-white/[0.08] bg-[#121215]/95 text-[11px] font-mono text-zinc-500 shrink-0">
            <button
              onClick={copyReference}
              className="hover:text-zinc-300 flex items-center gap-1.5 transition-colors"
              title="Copy Telegram reference"
            >
              {isCopiedRef ? <Check className="w-3.5 h-3.5 text-[#e6cfa3]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Msg #{file.messageId}</span>
            </button>

            <div className="flex items-center gap-2">
              <span>Client-Side JSZip Extraction</span>
              <span>•</span>
              <span>Zero Server Decompression</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
