import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Disc3, Maximize2, X, SkipForward } from "lucide-react";
import { useAudioPlayerStore } from "@/lib/stores/audio-player-store";

export const FloatingAudioBar: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isModalOpen,
    isFloatingVisible,
    togglePlay,
    openModal,
    stop,
    nextTrack,
    playlist,
  } = useAudioPlayerStore();

  if (!currentTrack || !isFloatingVisible || isModalOpen) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-2.5 right-2.5 z-40 flex select-none items-center gap-2.5 rounded-[6px] border border-white/[0.08] bg-[#111114] p-2 pr-2.5 text-zinc-200 shadow-[0_18px_50px_-14px_rgba(0,0,0,0.95)] md:bottom-4 md:left-auto md:right-4 md:max-w-md"
      >
        {/* Progress hairline */}
        <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden rounded-b-[6px] bg-white/[0.06]">
          <div
            className="h-full bg-[#e8d5b5]/85 transition-[width] duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <button
          type="button"
          onClick={openModal}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-white/[0.06] bg-[#0d0d10] text-[#c5a059] transition-colors hover:text-[#e8d5b5]"
          title="Open audio player"
          aria-label="Open audio player"
        >
          <Disc3
            className={`h-[18px] w-[18px] stroke-[1.5px] ${isPlaying ? "animate-[spin_6s_linear_infinite]" : ""}`}
          />
        </button>

        <div
          onClick={openModal}
          className="min-w-0 flex-1 cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openModal();
            }
          }}
          aria-label={`Open player — ${currentTrack.name}`}
        >
          <div className="truncate text-[12px] font-medium text-zinc-200">
            {currentTrack.name}
          </div>
          <div className="flex items-center gap-1.5 truncate text-[10px] text-zinc-600">
            <span className="truncate">{currentTrack.channelTitle}</span>
            {isPlaying && (
              <span className="ml-0.5 flex h-2.5 shrink-0 items-end gap-[2px] text-[#c5a059]">
                <span className="w-px rounded-full bg-[#c5a059] animate-equalize-1" />
                <span className="w-px rounded-full bg-[#c5a059] animate-equalize-2" />
                <span className="w-px rounded-full bg-[#c5a059] animate-equalize-3" />
                <span className="w-px rounded-full bg-[#c5a059] animate-equalize-4" />
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#e8d5b5] text-[#17130b] transition-colors hover:bg-[#f0dfc4]"
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5 fill-current stroke-none" />
            ) : (
              <Play className="ml-0.5 h-3.5 w-3.5 fill-current stroke-none" />
            )}
          </button>

          {playlist.length > 1 && (
            <button
              type="button"
              onClick={nextTrack}
              className="flex h-8 w-8 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white"
              title="Next track"
              aria-label="Next track"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={openModal}
            className="hidden h-8 w-8 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white sm:flex"
            title="Expand player"
            aria-label="Expand player"
          >
            <Maximize2 className="h-3 w-3 stroke-[1.6px]" />
          </button>

          <button
            type="button"
            onClick={stop}
            className="flex h-8 w-8 items-center justify-center rounded-[4px] text-zinc-600 transition-colors hover:bg-white/[0.06] hover:text-white"
            title="Stop and close"
            aria-label="Stop and close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
