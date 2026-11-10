import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  PieChart,
  Download,
} from "lucide-react";
import { useDriveStore } from "@/lib/stores/drive-store";
import { DriveFile, FileCategory } from "@/lib/telegram/indexer";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";

interface StorageAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile?: (file: DriveFile) => void;
}

export const StorageAnalyticsModal: React.FC<StorageAnalyticsModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
}) => {
  const { files, channels } = useDriveStore();

  const analytics = useMemo(() => {
    let totalBytes = 0;
    const catMap: Record<FileCategory, { count: number; bytes: number }> = {
      IMAGE: { count: 0, bytes: 0 },
      VIDEO: { count: 0, bytes: 0 },
      AUDIO: { count: 0, bytes: 0 },
      DOC: { count: 0, bytes: 0 },
      ARCHIVE: { count: 0, bytes: 0 },
      OTHER: { count: 0, bytes: 0 },
    };

    const channelMap: Record<string, { title: string; count: number; bytes: number }> = {};

    for (const f of files) {
      totalBytes += f.size;
      const cat = f.category || "OTHER";
      if (!catMap[cat]) catMap[cat] = { count: 0, bytes: 0 };
      catMap[cat].count += 1;
      catMap[cat].bytes += f.size;

      if (!channelMap[f.channelId]) {
        channelMap[f.channelId] = { title: f.channelTitle || f.channelId, count: 0, bytes: 0 };
      }
      channelMap[f.channelId].count += 1;
      channelMap[f.channelId].bytes += f.size;
    }

    const channelList = Object.entries(channelMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.bytes - a.bytes);

    const largestFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 5);

    return {
      totalBytes,
      totalCount: files.length,
      categories: catMap,
      channels: channelList,
      largestFiles,
    };
  }, [files]);

  if (!isOpen) return null;

  const getCatPercentage = (bytes: number) => {
    if (analytics.totalBytes <= 0) return 0;
    return Math.round((bytes / analytics.totalBytes) * 100);
  };

  const handleExportDriveIndex = () => {
    try {
      const exportData = {
        app: "Vaultgram",
        version: "2.0.0",
        exportedAt: new Date().toISOString(),
        totalFiles: files.length,
        totalBytes: analytics.totalBytes,
        channels: channels.map((c) => ({ id: c.id, title: c.title })),
        files: files.map((f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          category: f.category,
          mimeType: f.mimeType,
          date: f.date,
          channelId: f.channelId,
          channelTitle: f.channelTitle,
          messageId: f.messageId,
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vaultgram-index-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Drive catalog metadata exported to JSON.");
    } catch {
      toast.error("Failed to export drive catalog.");
    }
  };

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

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="relative z-10 flex flex-col w-full max-w-3xl max-h-[90vh] bg-[#121215] border border-white/[0.1] rounded-[8px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden backdrop-blur-2xl"
        >
          {/* Top Hairline Sheen */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.08] bg-[#121215]/95">
            <div className="flex items-center gap-3 min-w-0 mr-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white/[0.04] border border-white/[0.08] text-[#e6cfa3] shrink-0">
                <PieChart className="h-4.5 w-4.5 stroke-[1.5px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-medium font-sans text-white truncate">
                  Storage &amp; Drive Intelligence
                </h2>
                <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  Telegram Cloud Telemetry · Unlimited Bandwidth
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-[4px] transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4 stroke-[1.5px]" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-7 overflow-y-auto no-scrollbar space-y-5 text-xs font-sans bg-[#09090b]">
            {/* Top Stat Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3.5 rounded-[6px] border border-white/[0.08] bg-white/[0.02] space-y-1.5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Total Stored</span>
                <span className="text-base font-mono font-medium text-white block">
                  {formatBytes(analytics.totalBytes)}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 block truncate">
                  Across {analytics.channels.length} drives
                </span>
              </div>

              <div className="p-3.5 rounded-[6px] border border-white/[0.08] bg-white/[0.02] space-y-1.5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Total Files</span>
                <span className="text-base font-mono font-medium text-white block">
                  {analytics.totalCount.toLocaleString()}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 block">Indexed locally</span>
              </div>

              <div className="p-3.5 rounded-[6px] border border-white/[0.08] bg-white/[0.02] space-y-1.5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Cloud Quota</span>
                <span className="text-base font-mono font-medium text-[#e6cfa3] block">
                  Unlimited
                </span>
                <span className="text-[10px] font-mono text-zinc-500 block">Telegram MTProto</span>
              </div>

              <div className="p-3.5 rounded-[6px] border border-white/[0.08] bg-white/[0.02] space-y-1.5">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Max File Size</span>
                <span className="text-base font-mono font-medium text-white block">
                  2.00 GB
                </span>
                <span className="text-[10px] font-mono text-zinc-500 block">Per message cap</span>
              </div>
            </div>

            {/* Storage Distribution Proportional Bar */}
            <div className="rounded-[6px] border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
                <span className="uppercase tracking-wider text-[11px] text-zinc-400">Distribution by Category</span>
                <span className="text-zinc-500 font-sans">{analytics.totalCount} items total</span>
              </div>

              {/* Progress Bar Segments */}
              <div className="h-3.5 w-full bg-white/[0.06] rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${getCatPercentage(analytics.categories.VIDEO.bytes)}%` }}
                  className="bg-white/90 h-full border-r border-black/40"
                  title={`Videos: ${formatBytes(analytics.categories.VIDEO.bytes)}`}
                />
                <div
                  style={{ width: `${getCatPercentage(analytics.categories.IMAGE.bytes)}%` }}
                  className="bg-white/60 h-full border-r border-black/40"
                  title={`Images: ${formatBytes(analytics.categories.IMAGE.bytes)}`}
                />
                <div
                  style={{ width: `${getCatPercentage(analytics.categories.DOC.bytes)}%` }}
                  className="bg-white/40 h-full border-r border-black/40"
                  title={`Documents: ${formatBytes(analytics.categories.DOC.bytes)}`}
                />
                <div
                  style={{ width: `${getCatPercentage(analytics.categories.ARCHIVE.bytes)}%` }}
                  className="bg-[#c49b56] h-full border-r border-black/40"
                  title={`Archives: ${formatBytes(analytics.categories.ARCHIVE.bytes)}`}
                />
                <div
                  style={{ width: `${getCatPercentage(analytics.categories.AUDIO.bytes)}%` }}
                  className="bg-white/25 h-full border-r border-black/40"
                  title={`Audio: ${formatBytes(analytics.categories.AUDIO.bytes)}`}
                />
                <div
                  style={{ width: `${getCatPercentage(analytics.categories.OTHER.bytes)}%` }}
                  className="bg-white/10 h-full"
                  title={`Other: ${formatBytes(analytics.categories.OTHER.bytes)}`}
                />
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1.5 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/90 shrink-0" />
                  <span>Videos:</span>
                  <span className="text-white font-medium">{formatBytes(analytics.categories.VIDEO.bytes)}</span>
                  <span className="text-zinc-500">({analytics.categories.VIDEO.count})</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/60 shrink-0" />
                  <span>Images:</span>
                  <span className="text-white font-medium">{formatBytes(analytics.categories.IMAGE.bytes)}</span>
                  <span className="text-zinc-500">({analytics.categories.IMAGE.count})</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/40 shrink-0" />
                  <span>Docs:</span>
                  <span className="text-white font-medium">{formatBytes(analytics.categories.DOC.bytes)}</span>
                  <span className="text-zinc-500">({analytics.categories.DOC.count})</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#c49b56] shrink-0" />
                  <span>Archives:</span>
                  <span className="text-white font-medium">{formatBytes(analytics.categories.ARCHIVE.bytes)}</span>
                  <span className="text-zinc-500">({analytics.categories.ARCHIVE.count})</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/25 shrink-0" />
                  <span>Audio:</span>
                  <span className="text-white font-medium">{formatBytes(analytics.categories.AUDIO.bytes)}</span>
                  <span className="text-zinc-500">({analytics.categories.AUDIO.count})</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10 shrink-0" />
                  <span>Other:</span>
                  <span className="text-white font-medium">{formatBytes(analytics.categories.OTHER.bytes)}</span>
                  <span className="text-zinc-500">({analytics.categories.OTHER.count})</span>
                </div>
              </div>
            </div>

            {/* Channels Consumption Table */}
            <div className="rounded-[6px] border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] text-xs font-mono text-zinc-300 uppercase tracking-wider">
                Storage by Channel / Vault
              </div>
              <div className="divide-y divide-white/[0.04] max-h-48 overflow-y-auto no-scrollbar font-mono text-xs">
                {analytics.channels.map((ch) => {
                  const pct = getCatPercentage(ch.bytes);
                  return (
                    <div key={ch.id} className="p-3 px-4 flex items-center justify-between">
                      <div className="min-w-0 mr-3 flex-1">
                        <div className="flex items-center justify-between text-zinc-200 pb-1.5">
                          <span className="truncate font-sans font-medium">{ch.title}</span>
                          <span className="text-zinc-400 font-medium">{formatBytes(ch.bytes)} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className="h-full bg-white/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-[11px] text-zinc-500 shrink-0 ml-2">{ch.count} files</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Heaviest Files Top 5 */}
            <div className="rounded-[6px] border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] text-xs font-mono text-zinc-300 uppercase tracking-wider">
                Largest Indexed Files
              </div>
              <div className="divide-y divide-white/[0.04] font-mono text-xs">
                {analytics.largestFiles.map((file, idx) => (
                  <div
                    key={file.id}
                    onClick={() => {
                      if (onSelectFile) {
                        onClose();
                        onSelectFile(file);
                      }
                    }}
                    className="p-3 px-4 flex items-center justify-between hover:bg-white/[0.04] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 truncate mr-3">
                      <span className="text-[11px] text-zinc-600 w-4">{idx + 1}</span>
                      <span className="text-zinc-200 truncate font-sans">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-zinc-400 font-medium">{formatBytes(file.size)}</span>
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-[3px] bg-white/[0.04] border border-white/[0.08] text-zinc-400">
                        {file.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-white/[0.08] bg-[#121215]/95 text-[11px] font-mono text-zinc-500">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportDriveIndex}
              className="h-8 px-3 text-xs rounded-[6px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.1] gap-2 transition-all"
            >
              <Download className="w-3.5 h-3.5 stroke-[1.5px]" />
              <span>Export Metadata JSON</span>
            </Button>

            <Button
              size="sm"
              onClick={onClose}
              className="h-8 px-4 text-xs rounded-[6px] bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.12] transition-all"
            >
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
