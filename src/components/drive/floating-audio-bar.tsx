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
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 450, damping: 32 }}
        className="specimen-card hairline-sheen fixed bottom-3 sm:bottom-4 left-2.5 right-2.5 sm:left-auto sm:right-4 z-40 flex items-center gap-2.5 sm:gap-3 p-2 pr-3 rounded-[6px] text-zinc-200 sm:max-w-md select-none"
      >
        {/* Progress Bar Top Sheen */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-white/[0.08] overflow-hidden rounded-t-[6px]">
          <div
            className="h-full bg-gradient-to-r from-[#c49b56] via-amber-200 to-white transition-all duration-150 shadow-[0_0_8px_rgba(196,155,86,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Spinning Disc Avatar */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={openModal}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.12] text-zinc-300 hover:text-white transition-colors"
          title="Open Audio Studio"
        >
          <Disc3
            className={`h-5 w-5 stroke-[1.5px] text-[#c49b56] ${isPlaying ? "animate-[spin_6s_linear_infinite]" : ""}`}
          />
        </motion.button>

        {/* Track Info */}
        <div
          onClick={openModal}
          className="min-w-0 flex-1 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="text-xs font-medium text-white truncate max-w-[160px] sm:max-w-[200px] font-sans">
            {currentTrack.name}
          </div>
          <div className="text-[10px] font-mono text-zinc-500 truncate flex items-center gap-1.5">
            <span>{currentTrack.channelTitle}</span>
            {isPlaying && (
              <span className="flex items-end gap-[2px] h-3 text-[#c49b56] ml-1">
                <span className="w-0.5 bg-[#c49b56] rounded-full animate-equalize-1" />
                <span className="w-0.5 bg-[#e6cfa3] rounded-full animate-equalize-2" />
                <span className="w-0.5 bg-[#c49b56] rounded-full animate-equalize-3" />
                <span className="w-0.5 bg-white rounded-full animate-equalize-4" />
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={togglePlay}
            className="h-7 w-7 rounded-full bg-white/[0.1] hover:bg-white/[0.2] border border-white/[0.12] text-white flex items-center justify-center transition-all shadow-sm"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current stroke-none text-[#c49b56]" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current stroke-none ml-0.5 text-white" />
            )}
          </motion.button>

          {playlist.length > 1 && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={nextTrack}
              className="h-7 w-7 rounded-[3px] text-zinc-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
              title="Next Track"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={openModal}
            className="h-7 w-7 rounded-[3px] text-zinc-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
            title="Expand Full Player"
          >
            <Maximize2 className="w-3 h-3 stroke-[1.5px]" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={stop}
            className="h-7 w-7 rounded-[3px] text-zinc-500 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
            title="Stop & Close"
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
