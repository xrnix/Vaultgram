import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileCode,
  Download,
  Copy,
  Check,
  Search,
  WrapText,
  ZoomIn,
  ZoomOut,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { DriveFile } from "@/lib/telegram/indexer";
import { tgStreamClient } from "@/lib/telegram/client";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";

interface TextViewerModalProps {
  file: DriveFile | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: DriveFile) => void;
}

export const TextViewerModal: React.FC<TextViewerModalProps> = ({
  file,
  isOpen,
  onClose,
  onDownload,
}) => {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [fontSize, setFontSize] = useState<number>(12);
  const [wrapLines, setWrapLines] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const loadText = useCallback(async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setContent("");

    try {
      // 1. Stream via ServiceWorker
      if (navigator.serviceWorker?.controller) {
        try {
          const res = await fetch(`/stream/${file.id}`);
          if (res.ok) {
            const text = await res.text();
            setContent(text);
            setIsLoading(false);
            return;
          }
        } catch (fetchErr) {
          console.warn("[TextViewer] Stream fetch failed, trying MTProto:", fetchErr);
        }
      }

      // 2. MTProto downloadMedia fallback
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
        throw new Error("Text document message not found on Telegram.");
      }

      const raw = await client.downloadMedia(messages[0].media, {});
      if (!raw) throw new Error("Empty text file received.");

      const text = new TextDecoder("utf-8").decode(raw as ArrayBuffer);
      setContent(text);
      setIsLoading(false);
    } catch (err: any) {
      console.error("[TextViewer] Failed to load text:", err);
      setError(err.message || "Failed to read text document.");
      setIsLoading(false);
    }
  }, [file]);

  useEffect(() => {
    if (isOpen && file) {
      loadText();
    } else {
      setContent("");
    }
  }, [isOpen, file, loadText]);

  // Keyboard: Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const lines = useMemo(() => {
    if (!content) return [];
    return content.split("\n");
  }, [content]);

  const stats = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.length;
    return { linesCount: lines.length, words, chars };
  }, [content, lines]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    toast.success("Document text copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
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
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-white/[0.08] bg-[#121215]/95 shrink-0">
            <div className="flex items-center gap-3 min-w-0 mr-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white/[0.04] border border-white/[0.08] text-[#e6cfa3] shrink-0">
                <FileCode className="h-4.5 w-4.5 stroke-[1.5px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-medium font-sans text-white truncate">
                  {file.name}
                </h2>
                <div className="text-[11px] text-zinc-500 font-mono truncate flex items-center gap-2 mt-0.5">
                  <span>{formatBytes(file.size)}</span>
                  <span>•</span>
                  <span>{stats.linesCount} lines</span>
                  <span>•</span>
                  <span>{stats.words.toLocaleString()} words</span>
                </div>
              </div>
            </div>

            {/* Top Toolbar Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                disabled={!content}
                className="h-8 px-3 text-xs rounded-[6px] bg-white/[0.05] hover:bg-white/[0.12] text-zinc-300 hover:text-white border-white/[0.1] gap-1.5 transition-all"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-[#e6cfa3]" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Copy All</span>
              </Button>

              <Button
                size="sm"
                onClick={() => onDownload(file)}
                className="h-8 px-3 text-xs rounded-[6px] bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.12] gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5 stroke-[1.5px]" />
                <span className="hidden sm:inline">Download</span>
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

          {/* Sub-toolbar: Search & Formatting controls */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-2.5 border-b border-white/[0.06] bg-[#0d0d10] text-xs shrink-0">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Find in file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 font-mono text-xs bg-white/[0.03] border border-white/[0.08] rounded-[5px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setWrapLines(!wrapLines)}
                className={`p-1.5 px-2.5 rounded-[5px] border transition-colors flex items-center gap-1.5 text-[11px] font-mono ${
                  wrapLines
                    ? "bg-[#c49b56]/20 text-[#e6cfa3] border-[#c49b56]/40 font-medium"
                    : "bg-transparent text-zinc-400 hover:text-white border-transparent hover:bg-white/[0.05]"
                }`}
                title="Toggle line wrapping"
              >
                <WrapText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Wrap</span>
              </button>

              <div className="flex items-center border border-white/[0.08] rounded-[5px] bg-white/[0.02] p-0.5">
                <button
                  onClick={() => setFontSize((s) => Math.max(s - 1, 9))}
                  className="p-1 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded transition-colors"
                  title="Smaller text"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono text-[11px] text-zinc-400">{fontSize}px</span>
                <button
                  onClick={() => setFontSize((s) => Math.min(s + 1, 18))}
                  className="p-1 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded transition-colors"
                  title="Larger text"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Stage: Code View with Gutter */}
          <div className="relative flex-1 overflow-auto bg-[#09090b] flex">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400 bg-[#09090b]/80 backdrop-blur-sm z-20">
                <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
                <span className="text-xs font-mono text-zinc-400">Streaming document bytes via MTProto...</span>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
                <AlertCircle className="w-8 h-8 text-rose-400" />
                <div className="space-y-1 max-w-sm">
                  <span className="text-sm font-medium text-white block">Document Read Error</span>
                  <p className="text-xs text-zinc-400 leading-relaxed">{error}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadText}
                  className="text-xs h-8 rounded-[4px] border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Read</span>
                </Button>
              </div>
            )}

            {/* Line Number Gutter */}
            <div className="py-3 px-2 border-r border-white/[0.08] bg-[#0c0c0f] font-mono text-zinc-600 text-right select-none shrink-0" style={{ fontSize: `${fontSize}px`, minWidth: "3rem" }}>
              {lines.map((_, idx) => (
                <div key={idx} className="leading-relaxed">
                  {idx + 1}
                </div>
              ))}
            </div>

            {/* Text Content */}
            <div className="flex-1 p-3 overflow-x-auto select-text">
              <pre
                className={`font-mono text-zinc-200 leading-relaxed ${
                  wrapLines ? "whitespace-pre-wrap break-all" : "whitespace-pre"
                }`}
                style={{ fontSize: `${fontSize}px` }}
              >
                {searchQuery
                  ? lines.map((line, lIdx) => {
                      const qLower = searchQuery.toLowerCase();
                      const lineLower = line.toLowerCase();
                      if (!lineLower.includes(qLower)) return <div key={lIdx}>{line || "\n"}</div>;
                      const parts = line.split(new RegExp(`(${searchQuery})`, "gi"));
                      return (
                        <div key={lIdx}>
                          {parts.map((p, pIdx) =>
                            p.toLowerCase() === qLower ? (
                              <mark key={pIdx} className="bg-[#c49b56]/30 text-[#e6cfa3] px-1 rounded-[2px] border border-[#c49b56]/40">
                                {p}
                              </mark>
                            ) : (
                              p
                            )
                          )}
                        </div>
                      );
                    })
                  : content}
              </pre>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-white/[0.08] bg-[#121215]/95 text-[11px] font-mono text-zinc-500 shrink-0">
            <div className="flex items-center gap-2">
              <span>UTF-8 Encoding</span>
              <span>•</span>
              <span>{stats.chars.toLocaleString()} characters</span>
            </div>

            <div className="flex items-center gap-2">
              <span>Client-Side Stream Reader</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
