import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Pin, Star, X, Copy } from "lucide-react";
import { useDriveStore } from "@/lib/stores/drive-store";
import { useTransferStore } from "@/lib/stores/transfer-store";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";

export const BatchActionBar: React.FC = () => {
  const {
    files,
    selectedFileIds,
    clearSelection,
    togglePin,
    toggleFavorite,
    setCopyToVaultFiles,
  } = useDriveStore();

  const { enqueueDownload } = useTransferStore();

  const selectedFiles = useMemo(() => {
    return files.filter((f) => selectedFileIds.has(f.id));
  }, [files, selectedFileIds]);

  const totalBytes = useMemo(() => {
    return selectedFiles.reduce((acc, f) => acc + f.size, 0);
  }, [selectedFiles]);

  if (selectedFileIds.size === 0) return null;

  const handleBatchDownload = () => {
    for (const f of selectedFiles) {
      enqueueDownload(f);
    }
    toast.success(`Queued ${selectedFiles.length} files for download`);
    clearSelection();
  };

  const handleBatchPin = () => {
    for (const f of selectedFiles) {
      togglePin(f.id);
    }
    toast.success(`Toggled pin on ${selectedFiles.length} files`);
  };

  const handleBatchFavorite = () => {
    for (const f of selectedFiles) {
      toggleFavorite(f.id);
    }
    toast.success(`Toggled favorite on ${selectedFiles.length} files`);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex max-w-[95vw] -translate-x-1/2 select-none items-center gap-1 overflow-x-auto rounded-[6px] border border-white/[0.09] bg-[#141418]/95 p-1 pl-3 text-zinc-200 shadow-[0_16px_44px_-14px_rgba(0,0,0,0.95)] backdrop-blur-xl no-scrollbar md:bottom-6"
      >
        {/* Count — the only number that matters */}
        <div className="flex shrink-0 items-baseline gap-1.5 pr-2.5">
          <span className="num font-mono text-[12px] font-medium text-[#e8d5b5]">
            {selectedFileIds.size}
          </span>
          <span className="hidden text-[11.5px] text-zinc-400 sm:inline">selected</span>
          <span className="num font-mono text-[10.5px] text-zinc-600">{formatBytes(totalBytes)}</span>
        </div>

        <div className="h-4 w-px shrink-0 bg-white/[0.08]" />

        <div className="flex shrink-0 items-center gap-0.5 pl-1">
          <button
            type="button"
            onClick={handleBatchDownload}
            className="flex h-8 items-center gap-1.5 rounded-[4px] bg-[#e8d5b5] px-2.5 text-[11.5px] font-semibold text-[#17130b] transition-colors hover:bg-[#f0dfc4]"
          >
            <Download className="h-3.5 w-3.5 stroke-[2px]" />
            <span>Download</span>
          </button>

          <button
            type="button"
            onClick={handleBatchPin}
            className="flex h-8 items-center gap-1.5 rounded-[4px] px-2 text-[11.5px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Pin selection"
          >
            <Pin className="h-3.5 w-3.5 stroke-[1.6px]" />
            <span className="hidden sm:inline">Pin</span>
          </button>

          <button
            type="button"
            onClick={() => setCopyToVaultFiles(selectedFiles)}
            className="flex h-8 items-center gap-1.5 rounded-[4px] px-2 text-[11.5px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Clone to another vault, server-side"
          >
            <Copy className="h-3.5 w-3.5 stroke-[1.6px]" />
            <span className="hidden sm:inline">Clone</span>
          </button>

          <button
            type="button"
            onClick={handleBatchFavorite}
            className="flex h-8 items-center gap-1.5 rounded-[4px] px-2 text-[11.5px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Favorite selection"
          >
            <Star className="h-3.5 w-3.5 stroke-[1.6px]" />
            <span className="hidden sm:inline">Star</span>
          </button>

          <div className="mx-0.5 h-4 w-px shrink-0 bg-white/[0.08]" />

          <button
            type="button"
            onClick={clearSelection}
            className="flex h-8 w-8 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Clear selection"
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5 stroke-[1.8px]" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
