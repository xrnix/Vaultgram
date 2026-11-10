import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload } from "lucide-react";

interface DropzoneOverlayProps {
  activeChannelTitle: string;
  onFilesDropped: (files: FileList | File[]) => void;
}

export const DropzoneOverlay: React.FC<DropzoneOverlayProps> = ({
  activeChannelTitle,
  onFilesDropped,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsDragging(false);
        dragCounter = 0;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter = 0;

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFilesDropped(e.dataTransfer.files);
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [onFilesDropped]);

  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-6 select-none pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            className="specimen-card hairline-sheen relative flex h-full w-full max-w-xl max-h-[360px] flex-col items-center justify-center gap-4 rounded-[6px] border border-white/[0.18] p-8 text-center overflow-hidden"
          >
            {/* Technical Corner Crosshairs */}
            <span className="absolute top-2 left-3 font-mono text-[10px] text-zinc-600 select-none">┌ [INGEST_BAY]</span>
            <span className="absolute top-2 right-3 font-mono text-[10px] text-zinc-600 select-none">┐</span>
            <span className="absolute bottom-2 left-3 font-mono text-[10px] text-zinc-600 select-none">└</span>
            <span className="absolute bottom-2 right-3 font-mono text-[10px] text-zinc-600 select-none">[MTPROTO_V2] ┘</span>

            <div className="specimen-inset flex h-14 w-14 items-center justify-center rounded-[5px] text-zinc-200">
              <Upload className="h-6 w-6 stroke-[1.5px]" />
            </div>

            <div className="space-y-1 z-10 max-w-sm">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-medium">
                TRANSFER_MODE :: ASSET_INGESTION
              </div>
              <h2 className="text-sm sm:text-base font-medium text-white font-sans tracking-tight">
                Release pointer to stream files directly to Telegram
              </h2>
              <p className="text-xs text-zinc-400 font-mono pt-0.5">
                Target Vault: <span className="text-zinc-200 font-semibold bg-white/[0.04] px-2 py-0.5 rounded-[3px] border border-white/[0.08]">{activeChannelTitle}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-[3px] bg-white/[0.02] border border-white/[0.06] px-3 py-1 font-mono text-[10px] text-zinc-500 tracking-tight">
              <span>MTProto Chunked Pipeline</span>
              <span>•</span>
              <span>Max 2,000 MB / Asset</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
