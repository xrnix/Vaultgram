import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDriveStore, NavFilter } from "@/lib/stores/drive-store";
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
} from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerUpload: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onTriggerUpload,
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
    const categories: { id: NavFilter; label: string; icon: React.FC<any>; count: number }[] = [
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
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-3 select-none">
          {/* Frosted Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Floating Command Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            className="relative z-10 w-full max-w-xl rounded-lg border border-white/[0.12] bg-[#0c0e14]/95 shadow-[0_16px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden flex flex-col"
          >
            {/* Top Hairline Sheen */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Input Bar */}
            <div className="flex items-center px-3.5 py-3 border-b border-white/[0.08] gap-2.5">
              <Search className="h-4 w-4 text-zinc-400 stroke-[1.75px] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search files, channels, categories, or actions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none font-sans"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 text-zinc-500 hover:text-zinc-300 rounded"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-[3px] border border-white/[0.1] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] text-zinc-400">
                ESC
              </kbd>
            </div>

            {/* Scrollable Results List */}
            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3 divide-y divide-white/[0.04]">
              {/* Quick Actions */}
              {!query && (
                <div className="space-y-1">
                  <div className="px-2 pt-1 pb-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Quick Actions
                  </div>
                  <button
                    onClick={handleUploadClick}
                    className="flex h-8 w-full items-center justify-between px-2.5 rounded-[4px] text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Upload className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Upload File to Telegram</span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">Action</span>
                  </button>

                  <button
                    onClick={handleToggleView}
                    className="flex h-8 w-full items-center justify-between px-2.5 rounded-[4px] text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {viewMode === "grid" ? (
                        <List className="h-3.5 w-3.5 text-zinc-400" />
                      ) : (
                        <LayoutGrid className="h-3.5 w-3.5 text-zinc-400" />
                      )}
                      <span>Switch to {viewMode === "grid" ? "List" : "Grid"} View</span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">View</span>
                  </button>

                  <button
                    onClick={handleRefreshClick}
                    className="flex h-8 w-full items-center justify-between px-2.5 rounded-[4px] text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Sync & Refresh Channel Index</span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">Sync</span>
                  </button>
                </div>
              )}

              {/* Matched Files */}
              {matchedFiles.length > 0 && (
                <div className="space-y-1 pt-2">
                  <div className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                    <span>Files ({matchedFiles.length})</span>
                    <span className="text-zinc-600">Telegram Index</span>
                  </div>
                  {matchedFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => handleSelectFile(file)}
                      className="group flex h-9 w-full items-center justify-between px-2.5 rounded-[4px] text-xs hover:bg-white/[0.06] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 overflow-hidden mr-2">
                        <Files className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate text-zinc-200 group-hover:text-white font-medium">
                          {file.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-zinc-500">
                        <span className="hidden sm:inline text-zinc-400">{file.channelTitle}</span>
                        <span>•</span>
                        <span>{formatBytes(file.size)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Matched Categories */}
              {matchedCategories.length > 0 && (
                <div className="space-y-1 pt-2">
                  <div className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Categories
                  </div>
                  {matchedCategories.map((cat, idx) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleSelectCategory(cat.id)}
                        className="flex h-8 w-full items-center justify-between px-2.5 rounded-[4px] text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-zinc-500">
                            {String(idx + 1).padStart(2, "0")} ·
                          </span>
                          <Icon className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{cat.label}</span>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-500">{cat.count}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Matched Channels */}
              {matchedChannels.length > 0 && (
                <div className="space-y-1 pt-2">
                  <div className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    Channels
                  </div>
                  {matchedChannels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => handleSelectChannel(ch.id)}
                      className="flex h-8 w-full items-center justify-between px-2.5 rounded-[4px] text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="truncate">{ch.title}</span>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-500">
                        {ch.isSelf ? "Saved Messages" : "Channel"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Telemetry Bar */}
            <div className="flex items-center justify-between px-3.5 py-2 border-t border-white/[0.08] bg-white/[0.01] font-mono text-[10px] text-zinc-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.2 rounded-[2px] bg-white/[0.06] border border-white/[0.1] text-zinc-400">↵</kbd> Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.2 rounded-[2px] bg-white/[0.06] border border-white/[0.1] text-zinc-400">ESC</kbd> Close
                </span>
              </div>
              <span>Vaultgram Command Center</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
