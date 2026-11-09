import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTransferStore, TransferTask } from "@/lib/stores/transfer-store";
import { useDriveStore } from "@/lib/stores/drive-store";
import {
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Pause,
  Play,
  RotateCw,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { formatBytes, cn } from "@/lib/utils";

export const TransferDock: React.FC = () => {
  const {
    tasks,
    isOpen,
    toggleOpen,
    pauseTask,
    resumeTask,
    retryTask,
    cancelTask,
    removeTask,
    clearCompleted,
  } = useTransferStore();
  const { activeFilter } = useDriveStore();

  // If user is currently on dedicated Transfers View, hide the floating dock
  if (activeFilter === "TRANSFERS" || tasks.length === 0) {
    return null;
  }

  const activeUploads = tasks.filter((t) => t.type === "UPLOAD" && t.status === "ACTIVE").length;
  const activeDownloads = tasks.filter((t) => t.type === "DOWNLOAD" && t.status === "ACTIVE").length;
  const pausedCount = tasks.filter((t) => t.status === "PAUSED").length;
  const queuedCount = tasks.filter((t) => t.status === "QUEUED").length;
  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;

  const totalActive = activeUploads + activeDownloads;

  // Aggregate progress calculation
  const aggregateProgress =
    tasks.reduce((acc, t) => acc + (t.status === "COMPLETED" ? 100 : t.progress), 0) /
    (tasks.length || 1);

  return (
    <div className="fixed bottom-3 left-2.5 right-2.5 sm:left-auto sm:right-4 sm:bottom-4 z-50 sm:w-96 rounded-[5px] border border-white/[0.1] bg-[#121215]/98 backdrop-blur-2xl shadow-[0_16px_50px_rgba(0,0,0,0.8)] overflow-hidden select-none transition-all">
      {/* Top Hairline Sheen */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

      {/* Dock Header Bar */}
      <div
        onClick={toggleOpen}
        className="flex h-10 w-full cursor-pointer items-center justify-between px-3 bg-white/[0.02] hover:bg-white/[0.05] border-b border-white/[0.07] transition-colors"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {totalActive > 0 ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-white">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span className="truncate font-sans">
                {activeUploads > 0 && `↑ ${activeUploads} Upload${activeUploads > 1 ? "s" : ""} `}
                {activeDownloads > 0 && `↓ ${activeDownloads} Download${activeDownloads > 1 ? "s" : ""}`}
                {queuedCount > 0 && ` (${queuedCount} queued)`}
                {pausedCount > 0 && ` [${pausedCount} paused]`}
              </span>
            </div>
          ) : pausedCount > 0 ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>{pausedCount} transfer{pausedCount > 1 ? "s" : ""} paused</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-zinc-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-white stroke-[1.5px]" />
              <span>All transfers complete ({completedCount})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {completedCount > 0 && totalActive === 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearCompleted();
              }}
              className="text-[10px] font-mono text-zinc-300 hover:text-white px-2 py-0.5 rounded-[3px] bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors"
            >
              Clear
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleOpen();
            }}
            className="p-1 text-zinc-400 hover:text-white rounded"
          >
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Aggregate Hairline Progress Bar when Collapsed with Shimmer */}
      {!isOpen && (totalActive > 0 || pausedCount > 0) && (
        <div className="h-1 w-full bg-white/[0.05] relative overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300 relative overflow-hidden",
              pausedCount > 0 && totalActive === 0 ? "bg-amber-500" : "bg-gradient-to-r from-zinc-300 to-white"
            )}
            style={{ width: `${Math.max(5, aggregateProgress)}%` }}
          >
            {totalActive > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            )}
          </div>
        </div>
      )}

      {/* Expanded Transfer Task List */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04] bg-[#121215] p-2 space-y-2">
              {tasks.map((task) => (
                <TransferTaskRow
                  key={task.id}
                  task={task}
                  onPause={() => pauseTask(task.id)}
                  onResume={() => resumeTask(task.id)}
                  onRetry={() => retryTask(task.id)}
                  onCancel={() => cancelTask(task.id)}
                  onRemove={() => removeTask(task.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface TransferTaskRowProps {
  task: TransferTask;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onRemove: () => void;
}

const TransferTaskRow: React.FC<TransferTaskRowProps> = ({
  task,
  onPause,
  onResume,
  onRetry,
  onCancel,
  onRemove,
}) => {
  const isUpload = task.type === "UPLOAD";

  return (
    <div className="group flex flex-col gap-1.5 rounded-[4px] bg-white/[0.02] border border-white/[0.06] p-2.5 transition-all">
      {/* Top Row: Direction Badge + Name + Status + Controls */}
      <div className="flex items-center justify-between gap-2 overflow-hidden">
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
          {/* Direction Pill */}
          <div
            className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] text-[9px] font-mono shrink-0",
              isUpload
                ? "bg-white/[0.08] border border-white/[0.15] text-white"
                : "bg-white/[0.04] border border-white/[0.08] text-zinc-300"
            )}
          >
            {isUpload ? (
              <>
                <ArrowUp className="h-2.5 w-2.5 stroke-[2px]" />
                <span>UP</span>
              </>
            ) : (
              <>
                <ArrowDown className="h-2.5 w-2.5 stroke-[2px]" />
                <span>DL</span>
              </>
            )}
          </div>

          <span className="truncate text-xs font-medium text-zinc-200 font-sans" title={task.fileName}>
            {task.fileName}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className={cn(
              "font-mono text-[9px] px-1.5 py-0.5 rounded-[3px] uppercase tabular-nums",
              task.status === "ACTIVE"
                ? "border border-white/[0.15] bg-white/[0.06] text-white"
                : task.status === "PAUSED"
                ? "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                : task.status === "COMPLETED"
                ? "border border-white/[0.14] bg-white/[0.06] text-zinc-200"
                : task.status === "FAILED"
                ? "border border-rose-500/30 bg-rose-500/10 text-rose-400"
                : "border border-white/[0.08] bg-white/[0.03] text-zinc-500"
            )}
          >
            {task.status}
          </span>

          {/* Action buttons */}
          {task.status === "ACTIVE" && (
            <button
              onClick={onPause}
              className="p-1 text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-[3px] transition-colors"
              title="Pause"
            >
              <Pause className="h-3 w-3" />
            </button>
          )}

          {task.status === "PAUSED" && (
            <button
              onClick={onResume}
              className="p-1 text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-[3px] transition-colors"
              title="Resume"
            >
              <Play className="h-3 w-3" />
            </button>
          )}

          {task.status === "FAILED" && (
            <button
              onClick={onRetry}
              className="p-1 text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-[3px] transition-colors"
              title="Retry"
            >
              <RotateCw className="h-3 w-3" />
            </button>
          )}

          {task.status !== "COMPLETED" && task.status !== "FAILED" ? (
            <button
              onClick={onCancel}
              className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-[3px] transition-colors"
              title="Cancel"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <button
              onClick={onRemove}
              className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.08] rounded-[3px] transition-colors"
              title="Dismiss"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar & Telemetry */}
      <div className="space-y-1">
        <div className="h-1 w-full bg-white/[0.05] rounded-none overflow-hidden relative">
          <div
            className={cn(
              "h-full transition-all duration-200 relative overflow-hidden",
              task.status === "FAILED"
                ? "bg-rose-500"
                : task.status === "PAUSED"
                ? "bg-amber-500"
                : "bg-gradient-to-r from-zinc-400 to-white"
            )}
            style={{ width: `${Math.max(2, task.progress)}%` }}
          >
            {task.status === "ACTIVE" && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 tabular-nums">
          <span>
            {formatBytes(task.bytesTransferred)} / {formatBytes(task.fileSize)}
          </span>
          <div className="flex items-center gap-2">
            {task.speed && task.status === "ACTIVE" && (
              <span className="text-zinc-400">{task.speed}</span>
            )}
            <span>{Math.round(task.progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
