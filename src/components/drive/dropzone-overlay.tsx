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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 select-none pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 450, damping: 30 }}
            className="flex h-full w-full max-w-xl max-h-[380px] flex-col items-center justify-center gap-3 rounded-[6px] border-2 border-dashed border-white/25 bg-[#121215]/95 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-[4px] bg-white/[0.05] border border-white/[0.12] text-white shadow-lg animate-pulse">
              <Upload className="h-6 w-6 stroke-[1.75px]" />
            </div>

            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-white font-sans">
                Drop files to upload directly to Telegram
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                Target: <span className="text-zinc-200">{activeChannelTitle}</span>
              </p>
            </div>

            <div className="mt-2 rounded-[3px] bg-white/[0.03] border border-white/[0.08] px-3 py-1 text-[10px] font-mono text-zinc-500">
              Max 2 GB per file • 100% Client-Side MTProto Stream
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
