import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  SunMedium,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  FileText,
  File,
  Copy,
  Check,
} from "lucide-react";
import { DriveFile } from "@/lib/telegram/indexer";
import { tgStreamClient } from "@/lib/telegram/client";
import { registerActiveStreamFile, unregisterActiveStreamFile } from "@/lib/stream/stream-bridge";
import { useImagePreview } from "@/hooks/use-image-preview";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface MediaPreviewModalProps {
  file: DriveFile | null;
  onClose: () => void;
  onDownload: (file: DriveFile) => void;
  imagesList?: DriveFile[];
  onNavigateImage?: (file: DriveFile) => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  file,
  onClose,
  onDownload,
  imagesList = [],
  onNavigateImage,
}) => {
  const isOpen = !!file;
  const isImage = file?.category === "IMAGE";

  // Visual transformation states
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFlippedH, setIsFlippedH] = useState(false);
  const [isInverted, setIsInverted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCopiedRef, setIsCopiedRef] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const {
    imageUrl,
    isLoading,
    error,
    dimensions,
    setDimensions,
    retry,
  } = useImagePreview(file, tgStreamClient.client, isOpen && isImage);

  useEffect(() => {
    if (file) {
      registerActiveStreamFile(file);
      return () => {
        unregisterActiveStreamFile(file.id);
      };
    }
  }, [file]);

  // Carousel index resolution
  const currentImageIndex = imagesList.findIndex((img) => img.id === file?.id);
  const hasPrev = currentImageIndex > 0;
  const hasNext = currentImageIndex >= 0 && currentImageIndex < imagesList.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && onNavigateImage) {
      onNavigateImage(imagesList[currentImageIndex - 1]);
    }
  }, [hasPrev, onNavigateImage, imagesList, currentImageIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && onNavigateImage) {
      onNavigateImage(imagesList[currentImageIndex + 1]);
    }
  }, [hasNext, onNavigateImage, imagesList, currentImageIndex]);

  // Reset transforms when active file changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setIsFlippedH(false);
    setIsInverted(false);
  }, [file?.id]);

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setRotation((prev) => (prev + 90) % 360);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setIsFlippedH((prev) => !prev);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((prev) => Math.min(prev + 0.25, 5));
      } else if (e.key === "-") {
        e.preventDefault();
        setZoom((prev) => Math.max(prev - 0.25, 0.3));
      } else if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
        setRotation(0);
        setIsFlippedH(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  // Touchpad pinch & mouse wheel zoom listener
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.004;
        setZoom((prev) => Math.max(0.3, Math.min(5, Number((prev + delta).toFixed(2)))));
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [isOpen]);

  if (!file) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.3));
  const handleResetTransforms = () => {
    setZoom(1);
    setRotation(0);
    setIsFlippedH(false);
    setIsInverted(false);
  };

  const copyReference = () => {
    const text = `Channel: ${file.channelTitle} (ID: ${file.channelId}), Msg: ${file.messageId}`;
    navigator.clipboard.writeText(text);
    setIsCopiedRef(true);
    toast.success("Telegram message reference copied");
    setTimeout(() => setIsCopiedRef(false), 2000);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1 || zoom > 1.05) {
      touchStartRef.current = null;
      return;
    }
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      if (dx < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 h-[100dvh] flex flex-col items-center justify-between p-0 select-none bg-black/95 backdrop-blur-2xl"
        >
          {/* Top Floating Control Bar */}
          <div className="w-full flex items-center justify-between px-3 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 bg-gradient-to-b from-black/85 via-black/45 to-transparent z-30 shrink-0 gap-2">
            {/* Left: Metadata info */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <span className="hidden sm:inline-block font-mono text-[9px] uppercase tracking-wider text-[#e6cfa3] bg-[#c49b56]/20 border border-[#c49b56]/40 px-2 py-0.5 rounded-[3px] shrink-0">
                {file.category}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xs sm:text-sm font-medium text-white truncate">
                  {file.name}
                </h2>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-mono text-zinc-400 mt-0.5 truncate">
                  <span>{formatBytes(file.size)}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{dimensions ? `${dimensions.width} × ${dimensions.height} px` : formatDate(file.date)}</span>
                  {imagesList.length > 1 && currentImageIndex >= 0 && (
                    <>
                      <span>•</span>
                      <span className="text-[#c49b56] font-medium">
                        {currentImageIndex + 1} / {imagesList.length}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={copyReference}
                className="flex h-9 w-9 sm:h-8 sm:w-auto sm:px-2 items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-[4px] transition-colors gap-1.5 text-xs font-mono"
                title="Copy Telegram reference"
              >
                {isCopiedRef ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span className="hidden md:inline">Ref</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="hidden sm:flex h-8 w-8 items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-[4px] transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => onDownload(file)}
                className="h-9 w-9 sm:h-8 sm:w-auto p-0 sm:px-3 text-xs rounded-[4px] bg-white/[0.08] hover:bg-white/[0.16] text-white border-white/[0.18] gap-1.5 active:scale-[0.98] transition-all font-medium"
              >
                <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </Button>

              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center hover:bg-white/[0.1] text-zinc-300 hover:text-white rounded-[4px] transition-colors"
                title="Close (Esc)"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Canvas Viewport */}
          <div
            ref={viewportRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative flex-1 w-full flex items-center justify-center p-2 sm:p-10 overflow-hidden select-none"
          >
            {/* Carousel Previous */}
            {hasPrev && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 sm:left-8 z-30 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/65 border border-white/[0.15] text-zinc-300 hover:text-white hover:bg-black/90 hover:scale-105 active:scale-95 transition-all shadow-2xl backdrop-blur-md"
                title="Previous image (←)"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}

            {/* Carousel Next */}
            {hasNext && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 sm:right-8 z-30 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/65 border border-white/[0.15] text-zinc-300 hover:text-white hover:bg-black/90 hover:scale-105 active:scale-95 transition-all shadow-2xl backdrop-blur-md"
                title="Next image (→)"
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}

            {isImage ? (
              <>
                {isLoading && (
                  <div className="flex flex-col items-center gap-3 text-zinc-400">
                    <Loader2 className="w-7 h-7 animate-spin text-zinc-300" />
                    <span className="text-xs font-mono text-zinc-400">Fetching high-res image via MTProto...</span>
                  </div>
                )}

                {error && (
                  <div className="flex flex-col items-center gap-3 text-center max-w-sm p-6 bg-[#121215] border border-white/[0.1] rounded-[6px]">
                    <AlertCircle className="w-8 h-8 text-rose-400" />
                    <div className="text-xs text-zinc-300 leading-relaxed">{error}</div>
                    <Button
                      className="text-xs h-8 rounded-[4px] border-white/[0.1] bg-white/[0.08] hover:bg-white/[0.15] text-zinc-200"
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
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${isFlippedH ? -1 : 1})`,
                        transformOrigin: "center center",
                        filter: isInverted ? "invert(1) hue-rotate(180deg)" : "none",
                      }}
                      className="max-w-[92vw] max-h-[82vh] object-contain transition-transform duration-100 ease-out shadow-[0_20px_70px_rgba(0,0,0,0.9)] rounded-[2px]"
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
                className="max-w-[92vw] max-h-[82vh] rounded-[4px] bg-black shadow-2xl border border-white/[0.08]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-10 text-center text-zinc-400 bg-[#121215] border border-white/[0.1] rounded-[6px]">
                <div className="flex h-14 w-14 items-center justify-center rounded-[4px] bg-white/[0.03] border border-white/[0.08] text-zinc-300">
                  {file.category === "DOC" ? (
                    <FileText className="h-7 w-7 stroke-[1.5px]" />
                  ) : (
                    <File className="h-7 w-7 stroke-[1.5px]" />
                  )}
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-mono text-zinc-200 block">{file.name}</span>
                  <span className="text-[11px] font-mono text-zinc-500">{file.mimeType}</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Floating Studio Dock */}
          {imageUrl && !isLoading && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 450, damping: 30 }}
              className="w-full flex items-center justify-center pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 px-3 z-30 shrink-0"
            >
              <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[6px] sm:rounded-full bg-[#121215]/92 border border-white/[0.16] shadow-[0_15px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl max-w-full overflow-x-auto no-scrollbar">
                {/* Zoom Out */}
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.3}
                  className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center hover:bg-white/[0.1] disabled:opacity-30 text-zinc-300 hover:text-white rounded-[4px] sm:rounded-full transition-colors shrink-0"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <span className="text-[11px] font-mono text-zinc-200 px-1 min-w-[40px] text-center shrink-0">
                  {Math.round(zoom * 100)}%
                </span>

                {/* Zoom In */}
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 5}
                  className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center hover:bg-white/[0.1] disabled:opacity-30 text-zinc-300 hover:text-white rounded-[4px] sm:rounded-full transition-colors shrink-0"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-white/[0.14] mx-0.5 sm:mx-1 shrink-0" />

                {/* Rotate 90 CW */}
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center hover:bg-white/[0.1] text-zinc-300 hover:text-white rounded-[4px] sm:rounded-full transition-colors shrink-0"
                  title="Rotate 90° Clockwise (R)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Flip Horizontal */}
                <button
                  type="button"
                  onClick={() => setIsFlippedH((prev) => !prev)}
                  className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center hover:bg-white/[0.1] rounded-[4px] sm:rounded-full transition-colors shrink-0 ${
                    isFlippedH ? "text-[#c49b56] bg-white/[0.1]" : "text-zinc-300 hover:text-white"
                  }`}
                  title="Flip Horizontally (F)"
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>

                {/* Invert Filter */}
                <button
                  type="button"
                  onClick={() => setIsInverted((prev) => !prev)}
                  className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center hover:bg-white/[0.1] rounded-[4px] sm:rounded-full transition-colors shrink-0 ${
                    isInverted ? "text-[#c49b56] bg-white/[0.1]" : "text-zinc-300 hover:text-white"
                  }`}
                  title="Invert Colors"
                >
                  <SunMedium className="w-4 h-4" />
                </button>

                {(zoom !== 1 || rotation !== 0 || isFlippedH || isInverted) && (
                  <>
                    <div className="h-4 w-px bg-white/[0.14] mx-0.5 sm:mx-1 shrink-0" />
                    <button
                      type="button"
                      onClick={handleResetTransforms}
                      className="flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center hover:bg-white/[0.1] text-zinc-400 hover:text-white rounded-[4px] sm:rounded-full transition-colors shrink-0"
                      title="Reset Transforms (0)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MediaPreviewModal;
