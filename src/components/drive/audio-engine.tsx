import React, { useEffect, useRef } from "react";
import { useAudioPlayerStore } from "@/lib/stores/audio-player-store";
import { registerActiveStreamFile, unregisterActiveStreamFile } from "@/lib/stream/stream-bridge";

export const AudioEngine: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    currentTrack,
    isPlaying,
    currentTime,
    volume,
    isMuted,
    isLooping,
    playbackRate,
    updatePlaybackState,
    nextTrack,
    pause,
  } = useAudioPlayerStore();

  const lastTrackIdRef = useRef<string | null>(null);

  // Sync Track Source
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentTrack) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      lastTrackIdRef.current = null;
      return;
    }

    if (lastTrackIdRef.current !== currentTrack.id) {
      if (lastTrackIdRef.current) {
        unregisterActiveStreamFile(lastTrackIdRef.current);
      }
      lastTrackIdRef.current = currentTrack.id;
      registerActiveStreamFile(currentTrack);
      const streamUrl = `/stream/${encodeURIComponent(currentTrack.id)}`;
      audio.src = streamUrl;
      audio.load();
      if (isPlaying) {
        audio.play().catch((err) => {
          console.warn("[AudioEngine] Play error:", err);
          pause();
        });
      }
    }
  }, [currentTrack, isPlaying, pause]);

  // Sync Play / Pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying && audio.paused) {
      audio.play().catch((err) => {
        console.warn("[AudioEngine] Play interrupted:", err);
        pause();
      });
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying, currentTrack, pause]);

  // Sync Volume & Mute
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Sync Playback Rate
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  // Sync Looping
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = isLooping;
  }, [isLooping]);

  // Handle Seek from Store
  const seekingRef = useRef(false);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    // Only set if out of sync by > 1.5 seconds (indicating manual seek, not normal timeupdate)
    if (Math.abs(audio.currentTime - currentTime) > 1.5) {
      seekingRef.current = true;
      audio.currentTime = currentTime;
      setTimeout(() => {
        seekingRef.current = false;
      }, 100);
    }
  }, [currentTime, currentTrack]);

  // Audio Element Event Handlers
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || seekingRef.current) return;
    updatePlaybackState(audio.currentTime, audio.duration || 0, !audio.paused);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    updatePlaybackState(audio.currentTime, audio.duration || 0, !audio.paused);
  };

  const handleEnded = () => {
    if (!isLooping) {
      nextTrack();
    }
  };

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={handleEnded}
      preload="auto"
      className="hidden"
    />
  );
};
