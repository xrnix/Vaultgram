import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTransferStore, TransferTask } from "@/lib/stores/transfer-store";
import { useDriveStore } from "@/lib/stores/drive-store";
import { useAudioPlayerStore } from "@/lib/stores/audio-player-store";
import {
  X,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  RotateCw,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { formatBytes, cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const { activeFilter, showTransferDock, setShowTransferDock } = useDriveStore();
  const isAudioFloating = useAudioPlayerStore((s) => !!s.currentTrack && s.isFloatingVisible && !s.isModalOpen);

  // If user is currently on dedicated Transfers View, or transfers dock is toggled off, or no tasks: hide
  if (!showTransferDock || activeFilter === "TRANSFERS" || tasks.length === 0) {
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
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "fixed left-2.5 right-2.5 z-40 select-none overflow-hidden rounded-[6px] border border-white/[0.08] bg-[#111114] shadow-[0_18px_50px_-14px_rgba(0,0,0,0.95)] md:left-auto md:right-4 md:w-96",
        isAudioFloating
          ? "bottom-[calc(8.25rem+env(safe-area-inset-bottom))] md:bottom-20"
          : "bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-4"
      )}
    >
      {/* Header */}
      <div
        onClick={toggleOpen}
        className="flex h-10 w-full cursor-pointer items-center justify-between px-3 transition-colors hover:bg-white/[0.025]"
      >
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          {totalActive > 0 ? (
            <div className="flex min-w-0 items-center gap-2 text-[11.5px] text-zinc-200">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e8d5b5] opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#e8d5b5]" />
              </span>
              <span className="truncate">
                {activeUploads > 0 && `Uploading ${activeUploads}`}
                {activeUploads > 0 && activeDownloads > 0 && " · "}
                {activeDownloads > 0 && `Downloading ${activeDownloads}`}
                {queuedCount > 0 && (
                  <span className="text-zinc-600"> · {queuedCount} queued</span>
                )}
              </span>
            </div>
          ) : pausedCount > 0 ? (
            <div className="flex items-center gap-2 text-[11.5px] text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>{pausedCount} paused</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11.5px] text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
              <span>All complete</span>
              <span className="num font-mono text-[10.5px] text-zinc-600">{completedCount}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {completedCount > 0 && totalActive === 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearCompleted();
              }}
              className="rounded-[3px] px-1.5 py-1 text-[10.5px] text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200"
            >
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleOpen();
            }}
            className="rounded-[3px] p-1 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-white"
            title={isOpen ? "Collapse queue" : "Expand queue"}
            aria-label={isOpen ? "Collapse queue" : "Expand queue"}
          >
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowTransferDock(false);
              toast.info("Transfer dock hidden", {
                description: "Re-enable it anytime from Settings.",
                action: {
                  label: "Undo",
                  onClick: () => setShowTransferDock(true),
                },
              });
            }}
            className="rounded-[3px] p-1 text-zinc-600 transition-colors hover:bg-white/[0.05] hover:text-white"
            title="Hide dock"
            aria-label="Hide transfer dock"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Aggregate progress when collapsed */}
      {!isOpen && (totalActive > 0 || pausedCount > 0) && (
        <div className="h-px w-full bg-white/[0.06]">
          <div
            className={cn(
              "h-full transition-[width] duration-300",
              pausedCount > 0 && totalActive === 0 ? "bg-amber-400/80" : "bg-[#e8d5b5]/80"
            )}
            style={{ width: `${Math.max(2, aggregateProgress)}%` }}
          />
        </div>
      )}

      {/* Queue */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="no-scrollbar max-h-72 divide-y divide-white/[0.04] overflow-y-auto border-t border-white/[0.05] px-2 py-1">
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
    </motion.div>
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

  const meta =
    task.status === "ACTIVE"
      ? { label: "Transferring", dot: "bg-[#e8d5b5]", text: "text-zinc-400", fill: "bg-[#e8d5b5]/85" }
      : task.status === "PAUSED"
      ? { label: "Paused", dot: "bg-amber-400", text: "text-amber-300/90", fill: "bg-amber-400/80" }
      : task.status === "COMPLETED"
      ? { label: "Complete", dot: "bg-emerald-400/80", text: "text-zinc-600", fill: "bg-zinc-600" }
      : task.status === "FAILED"
      ? { label: "Failed", dot: "bg-rose-400", text: "text-rose-300", fill: "bg-rose-400/80" }
      : { label: "Queued", dot: "bg-zinc-600", text: "text-zinc-600", fill: "bg-zinc-700" };

  return (
    <div className="group flex flex-col gap-2 py-2.5">
      {/* Name + state + controls */}
      <div className="flex items-center justify-between gap-2 overflow-hidden">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          {isUpload ? (
            <ArrowUp className="h-3 w-3 shrink-0 stroke-[2px] text-[#c5a059]" />
          ) : (
            <ArrowDown className="h-3 w-3 shrink-0 stroke-[2px] text-zinc-500" />
          )}
          <span
            className="truncate text-[11.5px] text-zinc-300"
            title={task.fileName}
          >
            {task.fileName}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className="flex items-center gap-1.5 pr-0.5">
            <span className={cn("h-1 w-1 rounded-full", meta.dot)} />
            <span className={cn("text-[10px] tracking-tight", meta.text)}>{meta.label}</span>
          </span>

          {task.status === "ACTIVE" && (
            <button
              type="button"
              onClick={onPause}
              className="rounded-[3px] p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white"
              title="Pause"
              aria-label="Pause transfer"
            >
              <Pause className="h-3 w-3" />
            </button>
          )}

          {task.status === "PAUSED" && (
            <button
              type="button"
              onClick={onResume}
              className="rounded-[3px] p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white"
              title="Resume"
              aria-label="Resume transfer"
            >
              <Play className="h-3 w-3" />
            </button>
          )}

          {task.status === "FAILED" && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-[3px] p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white"
              title="Retry"
              aria-label="Retry transfer"
            >
              <RotateCw className="h-3 w-3" />
            </button>
          )}

          {task.status !== "COMPLETED" && task.status !== "FAILED" ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[3px] p-1 text-zinc-600 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
              title="Cancel"
              aria-label="Cancel transfer"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-[3px] p-1 text-zinc-600 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
              title="Dismiss"
              aria-label="Dismiss transfer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Hairline progress */}
      <div className="h-px w-full bg-white/[0.06]">
        <div
          className={cn("h-full transition-[width] duration-200", meta.fill)}
          style={{ width: `${Math.max(1, task.progress)}%` }}
        />
      </div>

      {/* Telemetry */}
      <div className="num flex items-baseline justify-between font-mono text-[10px] text-zinc-600">
        <span>
          {formatBytes(task.bytesTransferred)}
          <span className="text-zinc-700"> / {formatBytes(task.fileSize)}</span>
        </span>
        <span className="flex items-baseline gap-2">
          {task.speed && task.status === "ACTIVE" && (
            <span className="text-zinc-500">{task.speed}</span>
          )}
          <span className="text-zinc-500">{Math.round(task.progress)}%</span>
        </span>
      </div>
    </div>
  );
};
