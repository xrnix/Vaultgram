import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertCircle,
  Loader2,
  FileText,
  File,
  Copy,
  Check,
} from "lucide-react";
import { DriveFile } from "@/lib/telegram/indexer";
import { tgStreamClient } from "@/lib/telegram/client";
import { useImagePreview } from "@/hooks/use-image-preview";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface MediaPreviewModalProps {
  file: DriveFile | null;
  onClose: () => void;
  onDownload: (file: DriveFile) => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  file,
  onClose,
  onDownload,
}) => {
  const isOpen = !!file;
  const isImage = file?.category === "IMAGE";
  const [zoom, setZoom] = useState(1);
  const [isCopiedRef, setIsCopiedRef] = useState(false);

  const {
    imageUrl,
    isLoading,
    error,
    dimensions,
    setDimensions,
    retry,
  } = useImagePreview(file, tgStreamClient.client, isOpen && isImage);

  // Reset zoom on file change
  useEffect(() => {
    setZoom(1);
  }, [file?.id, isOpen]);

  // Keyboard listener: Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!file) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const copyReference = () => {
    const text = `Channel: ${file.channelTitle} (ID: ${file.channelId}), Msg: ${file.messageId}`;
    navigator.clipboard.writeText(text);
    setIsCopiedRef(true);
    toast.success("Telegram message reference copied");
    setTimeout(() => setIsCopiedRef(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="relative z-10 flex flex-col w-full max-w-4xl max-h-[92vh] sm:max-h-[88vh] bg-[#121215] border border-white/[0.1] rounded-[6px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden backdrop-blur-2xl"
          >
            {/* Top Hairline Sheen */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            {/* Header Bar */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-white/[0.08] bg-[#121215]/95">
              <div className="flex flex-col min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-300 bg-white/[0.05] border border-white/[0.1] px-1.5 py-0.2 rounded-[2px]">
                    {file.category}
                  </span>
                  <h2 className="text-xs sm:text-sm font-semibold text-white truncate font-sans" title={file.name}>
                    {file.name}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-zinc-400 mt-0.5 truncate">
                  <span className="truncate max-w-[120px] sm:max-w-none text-zinc-300">{file.channelTitle}</span>
                  <span className="text-zinc-600">•</span>
                  <span>{formatBytes(file.size)}</span>
                  <span className="hidden xs:inline text-zinc-600">•</span>
                  <span className="hidden xs:inline text-zinc-500">{formatDate(file.date)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {/* Image Zoom Toolbar */}
                {isImage && imageUrl && (
                  <div className="flex items-center gap-0.5 bg-white/[0.03] border border-white/[0.08] rounded-[3px] p-0.5 mr-1">
                    <button
                      onClick={handleZoomOut}
                      disabled={zoom <= 0.5}
                      className="p-1 hover:bg-white/[0.08] disabled:opacity-40 text-zinc-400 hover:text-white rounded-[2px] transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-zinc-300 px-1 min-w-[34px] text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      disabled={zoom >= 3}
                      className="p-1 hover:bg-white/[0.08] disabled:opacity-40 text-zinc-400 hover:text-white rounded-[2px] transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    {zoom !== 1 && (
                      <button
                        onClick={handleResetZoom}
                        className="p-1 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-[2px] transition-colors border-l border-white/[0.08]"
                        title="Reset Zoom"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-[3px] transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4 stroke-[1.5px]" />
                </button>
              </div>
            </div>

            {/* Viewport Stage */}
            <div className="relative flex-1 min-h-[360px] max-h-[64vh] flex items-center justify-center p-4 bg-[#09090b] overflow-hidden select-none bg-[radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:20px_20px]">
              {isImage ? (
                <>
                  {isLoading && (
                    <div className="flex flex-col items-center gap-2.5 text-zinc-400">
                      <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                      <span className="text-xs font-mono text-zinc-500">Fetching high-res media via MTProto...</span>
                    </div>
                  )}

                  {error && (
                    <div className="flex flex-col items-center gap-3 text-center max-w-sm">
                      <AlertCircle className="w-7 h-7 text-rose-400" />
                      <div className="text-xs text-zinc-300 leading-relaxed">{error}</div>
                      <Button
                        className="text-xs h-7 rounded-[4px] border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200"
                        onClick={retry}
                        size="sm"
                        variant="outline"
                      >
                        Retry Fetch
                      </Button>
                    </div>
                  )}

                  {imageUrl && !isLoading && !error && (
                    <div className="w-full h-full flex items-center justify-center overflow-auto no-scrollbar">
                      <img
                        src={imageUrl}
                        alt={file.name}
                        style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
                        className="max-w-full max-h-[58vh] object-contain transition-transform duration-100 ease-out shadow-[0_15px_40px_rgba(0,0,0,0.8)] rounded-[3px]"
                        onLoad={(e) => {
                          const target = e.currentTarget;
                          setDimensions({ width: target.naturalWidth, height: target.naturalHeight });
                        }}
                      />
                    </div>
                  )}
                </>
              ) : file.category === "VIDEO" || file.category === "AUDIO" ? (
                <video
                  controls
                  autoPlay
                  src={file.streamUrl}
                  className="max-h-[58vh] w-full rounded-[4px] bg-black shadow-2xl border border-white/[0.08]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-zinc-500">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[4px] bg-white/[0.03] border border-white/[0.08] text-zinc-300">
                    {file.category === "DOC" ? (
                      <FileText className="h-7 w-7 stroke-[1.5px]" />
                    ) : (
                      <File className="h-7 w-7 stroke-[1.5px]" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-mono text-zinc-300">{file.mimeType}</span>
                    <p className="text-[11px] text-zinc-500 font-sans">
                      Binary document. Direct preview available via download.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Bar */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-t border-white/[0.08] bg-[#121215]/95">
              <div className="text-[10px] sm:text-[11px] font-mono text-zinc-500 flex items-center gap-1.5 sm:gap-2 truncate mr-2">
                <span className="truncate">
                  {dimensions ? `${dimensions.width} × ${dimensions.height} px` : file.mimeType}
                </span>
                <button
                  onClick={copyReference}
                  className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors shrink-0 flex items-center gap-1"
                  title="Copy Telegram message reference"
                >
                  {isCopiedRef ? (
                    <Check className="h-3 w-3 text-white" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="h-7.5 px-3 text-xs border-white/[0.08] hover:bg-white/[0.06] text-zinc-300 hover:text-white rounded-[4px]"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onDownload(file);
                    onClose();
                  }}
                  className="h-7.5 px-3 text-xs gap-1.5 bg-white/[0.09] hover:bg-white/[0.16] text-white border border-white/[0.18] font-medium rounded-[4px] shadow-[0_0_15px_rgba(255,255,255,0.03)] active:scale-[0.98] transition-all"
                >
                  <Download className="w-3.5 h-3.5 stroke-[1.75px]" />
                  <span>Download<span className="hidden sm:inline"> File</span></span>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
export default MediaPreviewModal;
