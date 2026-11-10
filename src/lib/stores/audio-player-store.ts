import { create } from "zustand";
import { DriveFile } from "../telegram/indexer";

interface AudioPlayerState {
  currentTrack: DriveFile | null;
  playlist: DriveFile[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
  playbackRate: number;
  isModalOpen: boolean;
  isFloatingVisible: boolean;

  playTrack: (file: DriveFile, playlist?: DriveFile[]) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleLoop: () => void;
  setPlaybackRate: (rate: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  openModal: () => void;
  closeModal: () => void;
  stop: () => void;
  updatePlaybackState: (currentTime: number, duration: number, isPlaying?: boolean) => void;
}

export const useAudioPlayerStore = create<AudioPlayerState>((set, get) => ({
  currentTrack: null,
  playlist: [],
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  isLooping: false,
  playbackRate: 1.0,
  isModalOpen: false,
  isFloatingVisible: false,

  playTrack: (file: DriveFile, playlist = []) => {
    const list = playlist.length > 0 ? playlist : [file];
    set({
      currentTrack: file,
      playlist: list,
      isPlaying: true,
      currentTime: 0,
      isModalOpen: true,
      isFloatingVisible: true,
    });
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  seek: (time: number) => set({ currentTime: time }),

  setVolume: (volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped, isMuted: clamped === 0 });
  },

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleLoop: () => set((state) => ({ isLooping: !state.isLooping })),
  setPlaybackRate: (playbackRate: number) => set({ playbackRate }),

  nextTrack: () => {
    const { currentTrack, playlist } = get();
    if (!currentTrack || playlist.length <= 1) return;
    const currentIndex = playlist.findIndex((f) => f.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    set({
      currentTrack: playlist[nextIndex],
      currentTime: 0,
      isPlaying: true,
    });
  },

  prevTrack: () => {
    const { currentTrack, playlist, currentTime } = get();
    if (!currentTrack || playlist.length <= 1) return;
    if (currentTime > 3) {
      set({ currentTime: 0 });
      return;
    }
    const currentIndex = playlist.findIndex((f) => f.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    set({
      currentTrack: playlist[prevIndex],
      currentTime: 0,
      isPlaying: true,
    });
  },

  openModal: () => set({ isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false }),

  stop: () =>
    set({
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isModalOpen: false,
      isFloatingVisible: false,
    }),

  updatePlaybackState: (currentTime: number, duration: number, isPlaying?: boolean) => {
    set((state) => ({
      currentTime,
      duration: isNaN(duration) ? state.duration : duration,
      ...(isPlaying !== undefined ? { isPlaying } : {}),
    }));
  },
}));
