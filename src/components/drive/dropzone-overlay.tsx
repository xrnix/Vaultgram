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
            initial={{ scale: 0.985, y: 6 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.985, y: 6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex h-full max-h-[340px] w-full max-w-lg flex-col items-center justify-center gap-4 overflow-hidden rounded-[8px] border border-dashed border-[#e8d5b5]/25 bg-[#0d0d10]/95 p-8 text-center shadow-[0_40px_100px_-40px_rgba(0,0,0,1)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-[6px] border border-white/[0.06] bg-[#0a0a0c] text-[#e8d5b5] shadow-[inset_0_1px_2px_rgba(0,0,0,0.7)]">
              <Upload className="h-5 w-5 stroke-[1.6px]" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-[15px] font-medium tracking-[-0.01em] text-zinc-100">
                Drop to upload
              </h2>
              <p className="text-[12px] text-zinc-500">
                Streaming to <span className="text-zinc-300">{activeChannelTitle}</span>
              </p>
            </div>

            <p className="text-[10.5px] text-zinc-600">
              Straight to Telegram in 512 KB chunks · 2 GB per file
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
