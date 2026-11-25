import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDriveStore, NavFilter } from "@/lib/stores/drive-store";
import { useAudioPlayerStore } from "@/lib/stores/audio-player-store";
import { DriveFile } from "@/lib/telegram/indexer";
import {
  Search,
  Files,
  Image,
  Video,
  FileText,
  Archive,
  Music,
  Pin,
  Star,
  ArrowUpDown,
  RefreshCw,
  Upload,
  LayoutGrid,
  List,
  Layers,
  X,
  KeyRound,
  Users,
  PieChart,
  Disc3,
  FolderPlus,
  Activity,
  Keyboard,
  type LucideIcon,
} from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerUpload: () => void;
  onOpenAccountSwitcher?: () => void;
  onOpenExport?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onTriggerUpload,
  onOpenAccountSwitcher,
  onOpenExport,
}) => {
  const {
    channels,
    files,
    viewMode,
    setActiveChannel,
    setActiveFilter,
    setViewMode,
    refreshIndex,
    setPreviewFile,
    setAnalyticsOpen,
    setCreateVaultOpen,
    setNetworkMonitorOpen,
    setShortcutsOpen,
  } = useDriveStore();

  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Computed matching items
  const matchedCategories = useMemo(() => {
    const categories: { id: NavFilter; label: string; icon: LucideIcon; count: number }[] = [
      { id: "ALL", label: "All Files", icon: Files, count: files.length },
      { id: "IMAGE", label: "Images", icon: Image, count: files.filter((f) => f.category === "IMAGE").length },
      { id: "VIDEO", label: "Videos", icon: Video, count: files.filter((f) => f.category === "VIDEO").length },
      { id: "DOC", label: "Documents", icon: FileText, count: files.filter((f) => f.category === "DOC").length },
      { id: "ARCHIVE", label: "Archives", icon: Archive, count: files.filter((f) => f.category === "ARCHIVE").length },
      { id: "AUDIO", label: "Audio", icon: Music, count: files.filter((f) => f.category === "AUDIO").length },
      { id: "PINNED", label: "Pinned Items", icon: Pin, count: 0 },
      { id: "FAVORITES", label: "Favorites", icon: Star, count: 0 },
      { id: "TRANSFERS", label: "Transfer Manager", icon: ArrowUpDown, count: 0 },
    ];
    if (!query.trim()) return categories.slice(0, 5);
    const q = query.toLowerCase();
    return categories.filter((c) => c.label.toLowerCase().includes(q));
  }, [files, query]);

  const matchedChannels = useMemo(() => {
    if (!query.trim()) return channels.slice(0, 4);
    const q = query.toLowerCase();
    return channels.filter((c) => c.title.toLowerCase().includes(q));
  }, [channels, query]);

  const matchedFiles = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return files
      .filter((f) => f.name.toLowerCase().includes(q) || f.channelTitle.toLowerCase().includes(q))
      .slice(0, 8);
  }, [files, query]);

  const handleSelectCategory = (id: NavFilter) => {
    setActiveFilter(id);
    onClose();
  };

  const handleSelectChannel = (id: string) => {
    setActiveChannel(id);
    onClose();
  };

  const handleSelectFile = (file: DriveFile) => {
    setPreviewFile(file);
    onClose();
  };

  const handleUploadClick = () => {
    onClose();
    onTriggerUpload();
  };

  const handleToggleView = () => {
    setViewMode(viewMode === "grid" ? "list" : "grid");
    onClose();
  };

  const handleRefreshClick = () => {
    refreshIndex();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex select-none items-start justify-center p-2.5 pt-4 sm:p-3 sm:pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#040405]/80 backdrop-blur-[3px]"
          />

          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex w-full max-w-[620px] flex-col overflow-hidden rounded-[8px] border border-white/[0.09] bg-[#0e0e11] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_40px_100px_-30px_rgba(0,0,0,0.98)]"
          >
            {/* Query */}
            <div className="flex h-12 items-center gap-3 border-b border-white/[0.06] px-4">
              <Search className="h-4 w-4 shrink-0 stroke-[1.6px] text-zinc-600" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search files, vaults, actions…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent font-sans text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-zinc-600 transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close search"
                className="flex h-7 shrink-0 items-center rounded-[3px] px-2 text-[11px] text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-white sm:hidden"
              >
                Done
              </button>
              <kbd className="tactile-keycap hidden shrink-0 rounded-[3px] px-1.5 py-0.5 font-mono text-[9.5px] text-zinc-600 sm:inline-flex">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="no-scrollbar max-h-[64dvh] space-y-4 overflow-y-auto p-2.5 sm:max-h-[58vh]">
              {!query && (
                <section>
                  <div className="px-2 pb-1 pt-1 text-[10px] uppercase tracking-[0.13em] text-zinc-600">
                    Quick actions
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setCreateVaultOpen(true);
                    }}
                    className="flex h-9 w-full items-center justify-between rounded-[4px] px-2 text-[12.5px] text-zinc-300 transition-colors hover:bg-white/[0.045] hover:text-white"
                  >
                    <span className="flex items-center gap-2.5">
                      <FolderPlus className="h-3.5 w-3.5 text-[#c5a059]" />
                      <span>Create storage vault</span>
                    </span>
                    <span className="text-[10px] text-zinc-600">Vault</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="flex h-9 w-full items-center justify-between rounded-[4px] px-2 text-[12.5px] text-zinc-300 transition-colors hover:bg-white/[0.045] hover:text-white"
                  >
                    <span className="flex items-center gap-2.5">
                      <Upload className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Upload a file</span>
                    </span>
                    <span className="text-[10px] text-zinc-600">U</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleView}
                    className="flex h-9 w-full items-center justify-between rounded-[4px] px-2 text-[12.5px] text-zinc-300 transition-colors hover:bg-white/[0.045] hover:text-white"
                  >
                    <span className="flex items-center gap-2.5">
                      {viewMode === "grid" ? (
                        <List className="h-3.5 w-3.5 text-zinc-500" />
                      ) : (
                        <LayoutGrid className="h-3.5 w-3.5 text-zinc-500" />
                      )}
                      <span>Switch to {viewMode === "grid" ? "list" : "grid"} view</span>
                    </span>
                    <span className="text-[10px] text-zinc-600">View</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRefreshClick}
                    className="flex h-9 w-full items-center justify-between rounded-[4px] px-2 text-[12.5px] text-zinc-300 transition-colors hover:bg-white/[0.045] hover:text-white"
                  >
                    <span className="flex items-center gap-2.5">
                      <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Sync channel index</span>
                    </span>
                    <span className="text-[10px] text-zinc-600">Sync</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setAnalyticsOpen(true);
                    }}
                    className="flex h-9 w-full items-center justify-between rounded-[4px] px-2 text-[12.5px] text-zinc-300 transition-colors hover:bg-white/[0.045] hover:text-white"
                  >
                    <span className="flex items-center gap-2.5">
                      <PieChart className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Storage analytics</span>
                    </span>
                    <span className="text-[10px] text-zinc-600">Insights</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      useAudioPlayerStore.getState().openModal();
                    }}
                    className="flex h-9 w-full items-center justify-between rounded-[4px] px-2 text-[12.5px] text-zinc-300 transition-colors hover:bg-white/[0.045] hover:text-white"
                  >
                    <span className="flex items-center gap-2.5">
                      <Disc3 className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Audio player</span>
                    </span>
                    <span className="text-[10px] text-zinc-600">Player</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setNetworkMonitorOpen(true);
                    }}
                    className="flex h-9 w-full items-center justify-between rounded-[4px] px-2 text-[12.5px] text-zinc-300 transition-colors hover:bg-white/[0.045] hover:text-white"
                  >
                    <span className="flex items-center gap-2.5">
                      <Activity className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Network diagnostics</span>
                    </span>
                    <span className="text-[10px] text-zinc-600">Telemetry</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setShortcutsOpen(true);
                    }}
                    className="flex h-9 w-full items-center justify-between rounded-[4px] px-2 text-[12.5px] text-zinc-300 transition-colors hover:bg-white/[0.045] hover:text-white"
                  >
                    <span className="flex items-center gap-2.5">
                      <Keyboard className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Keyboard shortcuts</span>
                    </span>
                    <span className="text-[10px] text-zinc-600">?</span>
                  </button>

                  {onOpenExport && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenExport();
                      }}
                      className="flex h-9 w-full items-center justify-between rounded-[4px] px-2 text-[12.5px] text-zinc-300 transition-colors hover:bg-white/[0.045] hover:text-white"
                    >
                      <span className="flex items-center gap-2.5">
                        <KeyRound className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Export session string</span>
                      </span>
                      <span className="text-[10px] text-zinc-600">Session</span>
                    </button>
                  )}

                  {onOpenAccountSwitcher && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAccountSwitcher();
                      }}
                      className="flex h-9 w-full items-center justify-between rounded-[4px] px-2 text-[12.5px] text-zinc-300 transition-colors hover:bg-white/[0.045] hover:text-white"
                    >
                      <span className="flex items-center gap-2.5">
                        <Users className="h-3.5 w-3.5 text-zinc-500" />
                        <span>Switch account</span>
                      </span>
                      <span className="text-[10px] text-zinc-600">Profile</span>
                    </button>
                  )}
                </section>
              )}

              {matchedFiles.length > 0 && (
                <section>
                  <div className="flex items-center justify-between px-2 pb-1">
                    <span className="text-[10px] uppercase tracking-[0.13em] text-zinc-600">Files</span>
                    <span className="num font-mono text-[10px] text-zinc-700">{matchedFiles.length}</span>
                  </div>
                  {matchedFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => handleSelectFile(file)}
                      className="group flex min-h-[42px] w-full items-center justify-between gap-3 rounded-[4px] px-2 py-1.5 text-left transition-colors hover:bg-white/[0.045]"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Files className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                        <span className="truncate text-[12.5px] text-zinc-300 group-hover:text-white">
                          {file.name}
                        </span>
                      </span>
                      <span className="num flex shrink-0 items-center gap-2 font-mono text-[10px] text-zinc-600">
                        <span className="hidden max-w-[120px] truncate sm:inline">{file.channelTitle}</span>
                        <span>{formatBytes(file.size)}</span>
                      </span>
                    </button>
                  ))}
                </section>
              )}

              {matchedCategories.length > 0 && (
                <section>
                  <div className="px-2 pb-1 text-[10px] uppercase tracking-[0.13em] text-zinc-600">
                    Categories
                  </div>
                  {matchedCategories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat.id)}
                        className="flex min-h-[40px] w-full items-center justify-between rounded-[4px] px-2 text-[12.5px] text-zinc-300 transition-colors hover:bg-white/[0.045] hover:text-white sm:h-8"
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="h-3.5 w-3.5 text-zinc-600" />
                          <span>{cat.label}</span>
                        </span>
                        <span className="num font-mono text-[10px] text-zinc-600">{cat.count}</span>
                      </button>
                    );
                  })}
                </section>
              )}

              {matchedChannels.length > 0 && (
                <section>
                  <div className="px-2 pb-1 text-[10px] uppercase tracking-[0.13em] text-zinc-600">
                    Channels
                  </div>
                  {matchedChannels.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleSelectChannel(ch.id)}
                      className="flex min-h-[40px] w-full items-center justify-between rounded-[4px] px-2 text-[12.5px] text-zinc-300 transition-colors hover:bg-white/[0.045] hover:text-white sm:h-8"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Layers className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                        <span className="truncate">{ch.title}</span>
                      </span>
                      <span className="ml-2 shrink-0 text-[10px] text-zinc-600">
                        {ch.isSelf ? "Saved" : "Vault"}
                      </span>
                    </button>
                  ))}
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="hidden items-center justify-between border-t border-white/[0.06] px-4 py-2 text-[10px] text-zinc-600 sm:flex">
              <div className="flex items-center gap-3 font-mono">
                <span className="flex items-center gap-1">
                  <kbd className="tactile-keycap rounded-[2px] px-1 py-0.5 text-zinc-500">↵</kbd>
                  select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="tactile-keycap rounded-[2px] px-1 py-0.5 text-zinc-500">esc</kbd>
                  close
                </span>
              </div>
              <span className="tracking-[0.08em]">Vaultgram</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
