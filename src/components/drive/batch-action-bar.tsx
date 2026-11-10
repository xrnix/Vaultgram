import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Pin, Star, X, Copy } from "lucide-react";
import { useDriveStore } from "@/lib/stores/drive-store";
import { useTransferStore } from "@/lib/stores/transfer-store";
import { Button } from "@/components/ui/button";
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
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 450, damping: 32 }}
        className="specimen-card hairline-sheen fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-2 px-3 rounded-[6px] text-zinc-200 select-none max-w-[95vw] overflow-x-auto no-scrollbar"
      >
        {/* Selected Counter Pill */}
        <div className="flex items-center gap-2 pr-2 border-r border-white/[0.1] text-xs font-mono">
          <div className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-white text-black font-semibold text-[10px]">
            {selectedFileIds.size}
          </div>
          <span className="text-zinc-300 font-medium hidden sm:inline">Selected</span>
          <span className="text-zinc-500 text-[11px]">({formatBytes(totalBytes)})</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              onClick={handleBatchDownload}
              className="h-7 px-2.5 text-xs rounded-[4px] bg-white text-black hover:bg-zinc-200 font-medium gap-1.5 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5 stroke-[2px]" />
              <span>Download All</span>
            </Button>
          </motion.div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleBatchPin}
            className="h-7 px-2 rounded-[4px] text-xs font-mono text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.1] flex items-center gap-1 transition-colors"
            title="Batch Pin"
          >
            <Pin className="w-3 h-3 stroke-[1.5px]" />
            <span className="hidden sm:inline">Pin</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setCopyToVaultFiles(selectedFiles)}
            className="h-7 px-2 rounded-[4px] text-xs font-mono text-[#e6cfa3] hover:text-white hover:bg-white/[0.08] border border-white/[0.1] flex items-center gap-1 transition-colors"
            title="Instant server-side clone to another vault"
          >
            <Copy className="w-3 h-3 stroke-[1.5px] text-[#c49b56]" />
            <span className="hidden sm:inline">Clone</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleBatchFavorite}
            className="h-7 px-2 rounded-[4px] text-xs font-mono text-amber-400/90 hover:text-amber-300 hover:bg-white/[0.08] border border-white/[0.1] flex items-center gap-1 transition-colors"
            title="Batch Favorite"
          >
            <Star className="w-3 h-3 stroke-[1.5px] fill-amber-400/30" />
            <span className="hidden sm:inline">Star</span>
          </motion.button>

          <div className="h-4 w-px bg-white/[0.1] mx-0.5" />

          {/* Clear Selection */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={clearSelection}
            className="h-7 w-7 rounded-[4px] text-zinc-400 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-colors"
            title="Clear Selection"
          >
            <X className="w-3.5 h-3.5 stroke-[1.5px]" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
