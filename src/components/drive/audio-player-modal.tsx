import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Repeat,
  Download,
  ListMusic,
  ChevronDown,
  Music,
  Disc3,
  Copy,
  Check,
} from "lucide-react";
import { useAudioPlayerStore } from "@/lib/stores/audio-player-store";
import { useTransferStore } from "@/lib/stores/transfer-store";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";

export const AudioPlayerModal: React.FC = () => {
  const {
    currentTrack,
    playlist,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLooping,
    playbackRate,
    isModalOpen,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    toggleLoop,
    setPlaybackRate,
    nextTrack,
    prevTrack,
    closeModal,
    playTrack,
  } = useAudioPlayerStore();

  const { enqueueDownload } = useTransferStore();
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isCopiedRef, setIsCopiedRef] = useState(false);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  if (!isModalOpen || !currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickPos = (e.clientX - rect.left) / rect.width;
    const targetTime = Math.max(0, Math.min(duration, clickPos * duration));
    seek(targetTime);
  };

  const handleSkip = (seconds: number) => {
    const target = Math.max(0, Math.min(duration, currentTime + seconds));
    seek(target);
  };

  const cyclePlaybackRate = () => {
    const rates = [1.0, 1.25, 1.5, 2.0];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const copyReference = () => {
    const text = `Channel: ${currentTrack.channelTitle} (ID: ${currentTrack.channelId}), Msg: ${currentTrack.messageId}`;
    navigator.clipboard.writeText(text);
    setIsCopiedRef(true);
    toast.success("Telegram audio message reference copied");
    setTimeout(() => setIsCopiedRef(false), 2000);
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
          onClick={closeModal}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="relative z-10 flex flex-col w-full max-w-xl bg-[#121215] border border-white/[0.1] rounded-[8px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden backdrop-blur-2xl"
        >
          {/* Top Hairline Sheen */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* Header Bar */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-white/[0.08] bg-[#121215]/95">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#e6cfa3] bg-[#c49b56]/15 border border-[#c49b56]/30 px-2 py-0.5 rounded-[3px]">
                Audio Stream Engine · MTProto Range
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPlaylist(!showPlaylist)}
                className={`p-1.5 px-2.5 rounded-[4px] border transition-colors flex items-center gap-1.5 text-[11px] font-mono ${
                  showPlaylist
                    ? "bg-white/[0.08] text-white border-white/[0.18]"
                    : "bg-transparent text-zinc-400 hover:text-white border-transparent hover:bg-white/[0.05]"
                }`}
                title="Toggle Playlist"
              >
                <ListMusic className="w-3.5 h-3.5 stroke-[1.5px]" />
                <span className="hidden sm:inline">Playlist ({playlist.length})</span>
              </button>

              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-[4px] transition-colors"
                title="Minimize to Floating Dock"
              >
                <ChevronDown className="w-4 h-4 stroke-[1.5px]" />
              </button>

              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-[4px] transition-colors"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[1.5px]" />
              </button>
            </div>
          </div>

          {/* Main Stage */}
          <div className="p-6 sm:p-8 flex flex-col items-center bg-[#09090b] relative overflow-hidden">
            {/* Background Radial Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,transparent_70%)] pointer-events-none" />

            {/* Vinyl Record Visual */}
            <div className="relative mb-6">
              <div
                className={`relative flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-full bg-gradient-to-tr from-[#121215] via-[#1a1a20] to-[#121215] border-2 border-white/[0.15] shadow-[0_15px_40px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(0,0,0,0.8)] ${
                  isPlaying ? "animate-[spin_12s_linear_infinite]" : ""
                }`}
              >
                {/* Vinyl Grooves */}
                <div className="absolute inset-3 rounded-full border border-white/[0.04]" />
                <div className="absolute inset-6 rounded-full border border-white/[0.04]" />
                <div className="absolute inset-9 rounded-full border border-white/[0.04]" />

                {/* Center Disc Label */}
                <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-[#18181b] border border-white/[0.2] shadow-inner text-zinc-300">
                  <Disc3 className="h-6 w-6 stroke-[1.5px]" />
                </div>
              </div>

              {/* Live Dynamic Equalizer Animation Bars */}
              {isPlaying && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-1 px-2.5 py-1 rounded-[4px] bg-[#121215]/95 border border-white/[0.15] shadow-lg">
                  <span className="w-1 bg-[#c49b56] rounded-full animate-equalize-1" />
                  <span className="w-1 bg-[#e6cfa3] rounded-full animate-equalize-2" />
                  <span className="w-1 bg-[#c49b56] rounded-full animate-equalize-3" />
                  <span className="w-1 bg-white rounded-full animate-equalize-4" />
                </div>
              )}
            </div>

            {/* Track Info */}
            <div className="w-full text-center space-y-1 mb-5 z-10">
              <h3 className="text-base sm:text-lg font-medium text-white tracking-tight font-sans truncate max-w-md mx-auto">
                {currentTrack.name}
              </h3>
              <p className="text-xs text-zinc-400 font-sans truncate max-w-sm mx-auto">
                {currentTrack.channelTitle} · <span className="font-mono text-[11px] text-zinc-500">{formatBytes(currentTrack.size)}</span>
              </p>
            </div>

            {/* Scrubber Timeline */}
            <div className="w-full space-y-1.5 mb-6 z-10">
              <div
                ref={progressBarRef}
                onClick={handleProgressBarClick}
                className="group relative h-2 w-full cursor-pointer rounded-full bg-white/[0.08] overflow-hidden"
              >
                <div
                  className="h-full bg-gradient-to-r from-[#c49b56] via-amber-200 to-white transition-all rounded-full relative shadow-[0_0_10px_rgba(196,155,86,0.5)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Transport Audio Controls */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 z-10">
              {/* Loop Button */}
              <button
                onClick={toggleLoop}
                className={`p-2 rounded-[4px] border transition-colors ${
                  isLooping
                    ? "bg-white/[0.1] text-white border-white/[0.2]"
                    : "text-zinc-500 hover:text-white border-transparent hover:bg-white/[0.05]"
                }`}
                title={isLooping ? "Repeat On" : "Repeat Off"}
              >
                <Repeat className="w-4 h-4 stroke-[1.5px]" />
              </button>

              {/* Skip -10s */}
              <button
                onClick={() => handleSkip(-10)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-[4px] transition-colors"
                title="Rewind 10s"
              >
                <RotateCcw className="w-4 h-4 stroke-[1.5px]" />
              </button>

              {/* Previous Track */}
              <button
                onClick={prevTrack}
                disabled={playlist.length <= 1}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-[4px] transition-colors disabled:opacity-30 disabled:pointer-events-none"
                title="Previous Track"
              >
                <SkipBack className="w-5 h-5 stroke-[1.5px]" />
              </button>

              {/* Play / Pause Primary Button */}
              <button
                onClick={togglePlay}
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white hover:bg-zinc-200 text-black flex items-center justify-center shadow-[0_4px_20px_rgba(255,255,255,0.15)] active:scale-[0.96] transition-all"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current stroke-none" />
                ) : (
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current stroke-none ml-0.5" />
                )}
              </button>

              {/* Next Track */}
              <button
                onClick={nextTrack}
                disabled={playlist.length <= 1}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-[4px] transition-colors disabled:opacity-30 disabled:pointer-events-none"
                title="Next Track"
              >
                <SkipForward className="w-5 h-5 stroke-[1.5px]" />
              </button>

              {/* Skip +10s */}
              <button
                onClick={() => handleSkip(10)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-[4px] transition-colors"
                title="Forward 10s"
              >
                <RotateCw className="w-4 h-4 stroke-[1.5px]" />
              </button>

              {/* Playback Rate */}
              <button
                onClick={cyclePlaybackRate}
                className="h-8 px-2 rounded-[4px] font-mono text-xs text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition-colors"
                title="Playback Speed"
              >
                {playbackRate}x
              </button>
            </div>

            {/* Volume Deck */}
            <div className="flex items-center gap-2 mt-6 z-10 w-48">
              <button
                onClick={toggleMute}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>

          {/* Playlist Drawer */}
          {showPlaylist && (
            <div className="border-t border-white/[0.08] bg-[#0d0d10] p-3 max-h-48 overflow-y-auto no-scrollbar space-y-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-1 pb-1">
                Queue ({playlist.length} Tracks)
              </div>
              {playlist.map((item, idx) => {
                const isSelected = item.id === currentTrack.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => playTrack(item, playlist)}
                    className={`w-full flex items-center justify-between p-2 rounded-[4px] border text-left transition-all ${
                      isSelected
                        ? "border-white/[0.2] bg-white/[0.08] text-white"
                        : "border-transparent bg-transparent hover:bg-white/[0.04] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] text-zinc-600 w-4">{idx + 1}</span>
                      <Music className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs truncate">{item.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500 shrink-0 ml-2">
                      {formatBytes(item.size)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer Bar */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-white/[0.08] bg-[#121215]/95 text-[11px] font-mono text-zinc-500">
            <button
              onClick={copyReference}
              className="hover:text-zinc-300 flex items-center gap-1.5 transition-colors"
              title="Copy Telegram reference"
            >
              {isCopiedRef ? <Check className="w-3.5 h-3.5 text-[#e6cfa3]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Msg #{currentTrack.messageId}</span>
            </button>

            <button
              onClick={() => enqueueDownload(currentTrack)}
              className="hover:text-white flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
