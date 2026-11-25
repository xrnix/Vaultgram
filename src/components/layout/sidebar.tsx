import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDriveStore, NavFilter } from "@/lib/stores/drive-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useTransferStore } from "@/lib/stores/transfer-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Layers,
  Files,
  Image,
  Video,
  FileText,
  Archive,
  Music,
  Pin,
  Star,
  Plus,
  Folder,
  Trash2,
  Bookmark,
  ArrowUpDown,
  X,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { VaultgramLogo } from "@/components/ui/vaultgram-logo";
import { AccountSwitcherDialog } from "@/components/drive/account-switcher-dialog";
import { SessionExportModal } from "@/components/drive/session-export-modal";
import { cn, formatBytes } from "@/lib/utils";
import { ACCENT_TOKENS, MEDIA_TOKENS } from "@/lib/media-tokens";

export const Sidebar: React.FC = () => {
  const {
    channels,
    activeChannelId,
    activeFilter,
    files,
    customFolders,
    pinnedFileIds,
    favoriteFileIds,
    isMobileSidebarOpen,
    setActiveChannel,
    setActiveFilter,
    setMobileSidebarOpen,
    createCustomFolder,
    deleteCustomFolder,
    setCreateVaultOpen,
    setNetworkMonitorOpen,
    setSettingsOpen,
  } = useDriveStore();

  const { user, isConnected } = useAuthStore();
  const { tasks } = useTransferStore();

  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const [isSessionExportOpen, setIsSessionExportOpen] = useState(false);

  // Dismiss mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileSidebarOpen, setMobileSidebarOpen]);

  const activeTransfersCount = tasks.filter((t) => t.status === "ACTIVE" || t.status === "QUEUED").length;

  // Compute category counts
  const counts = useMemo(() => {
    const c = {
      ALL: files.length,
      IMAGE: 0,
      VIDEO: 0,
      DOC: 0,
      ARCHIVE: 0,
      AUDIO: 0,
      PINNED: pinnedFileIds.size,
      FAVORITES: favoriteFileIds.size,
    };
    for (const f of files) {
      if (f.category === "IMAGE") c.IMAGE++;
      else if (f.category === "VIDEO") c.VIDEO++;
      else if (f.category === "DOC") c.DOC++;
      else if (f.category === "ARCHIVE") c.ARCHIVE++;
      else if (f.category === "AUDIO") c.AUDIO++;
    }
    return c;
  }, [files, pinnedFileIds, favoriteFileIds]);

  const totalIndexedBytes = useMemo(() => {
    return files.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [files]);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      createCustomFolder(newFolderName.trim());
      setNewFolderName("");
      setIsNewFolderOpen(false);
    }
  };

  const getInitials = (title: string) => {
    if (!title) return "CH";
    const words = title.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return title.slice(0, 2).toUpperCase();
  };

  const navItems: { id: NavFilter; label: string; icon: LucideIcon; count: number; hue: string }[] = [
    { id: "ALL", label: "All files", icon: Files, count: counts.ALL, hue: ACCENT_TOKENS.ALL },
    { id: "IMAGE", label: "Images", icon: Image, count: counts.IMAGE, hue: MEDIA_TOKENS.IMAGE.hue },
    { id: "VIDEO", label: "Videos", icon: Video, count: counts.VIDEO, hue: MEDIA_TOKENS.VIDEO.hue },
    { id: "DOC", label: "Documents", icon: FileText, count: counts.DOC, hue: MEDIA_TOKENS.DOC.hue },
    { id: "AUDIO", label: "Audio", icon: Music, count: counts.AUDIO, hue: MEDIA_TOKENS.AUDIO.hue },
    { id: "ARCHIVE", label: "Archives", icon: Archive, count: counts.ARCHIVE, hue: MEDIA_TOKENS.ARCHIVE.hue },
  ];

  const quickAccessItems: { id: NavFilter; label: string; icon: LucideIcon; count: number; hue: string }[] = [
    { id: "PINNED", label: "Pinned", icon: Pin, count: counts.PINNED, hue: ACCENT_TOKENS.PINNED },
    { id: "FAVORITES", label: "Favorites", icon: Star, count: counts.FAVORITES, hue: ACCENT_TOKENS.FAVORITES },
    { id: "TRANSFERS", label: "Transfers", icon: ArrowUpDown, count: activeTransfersCount, hue: ACCENT_TOKENS.TRANSFERS },
  ];

  const renderContent = (isMobile: boolean) => (
    <div className="flex h-full select-none flex-col bg-[#0b0b0e] text-zinc-300">
      {/* Brand header — one mark, one wordmark, no telemetry badges */}
      <div className="flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-center justify-between border-b border-white/[0.05] px-4 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2.5">
          <VaultgramLogo className="h-[18px] w-[18px]" />
          <span className="text-[13px] font-semibold tracking-[-0.015em] text-white">Vaultgram</span>
        </div>
        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-white active:scale-95"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4 stroke-[1.5px]" />
          </button>
        ) : (
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-700">v1.0</span>
        )}
      </div>

      {/* Channels */}
      <div className="shrink-0 px-3 pb-3 pt-4">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="type-meta">Channels</span>
          <button
            type="button"
            onClick={() => {
              if (isMobile) setMobileSidebarOpen(false);
              setCreateVaultOpen(true);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-[3px] text-zinc-600 transition-colors hover:bg-white/[0.05] hover:text-[#e8d5b5]"
            title="Create a private storage channel"
            aria-label="Create channel"
          >
            <Plus className="h-3 w-3 stroke-[2px]" />
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar touch-pan-x">
          <button
            type="button"
            onClick={() => {
              setActiveChannel("UNIFIED");
              if (isMobile) setMobileSidebarOpen(false);
            }}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] px-2.5 text-[11.5px] transition-colors",
              activeChannelId === "UNIFIED"
                ? "bg-white/[0.07] text-white"
                : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-200"
            )}
          >
            <Layers className="h-3.5 w-3.5 shrink-0 stroke-[1.5px]" />
            <span>All</span>
          </button>

          {channels.map((ch) => {
            const isAct = activeChannelId === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  setActiveChannel(ch.id);
                  if (isMobile) setMobileSidebarOpen(false);
                }}
                title={ch.title}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] px-2 text-[11.5px] transition-colors",
                  isAct
                    ? "bg-white/[0.07] text-white"
                    : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-200"
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] font-mono text-[9px]",
                    isAct ? "bg-white/[0.12] text-white" : "bg-white/[0.04] text-zinc-500"
                  )}
                >
                  {ch.isSelf ? <Bookmark className="h-2.5 w-2.5" /> : getInitials(ch.title)}
                </span>
                <span className="max-w-[96px] truncate">{ch.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Library */}
      <ScrollArea className="flex-1 px-3 pb-3">
        <div className="px-1 pb-1.5 pt-2">
          <span className="type-meta">Library</span>
        </div>
        <nav className="space-y-px" aria-label="Library">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isAct = activeFilter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveFilter(item.id);
                  if (isMobile) setMobileSidebarOpen(false);
                }}
                aria-current={isAct ? "page" : undefined}
                className={cn(
                  "flex h-8 w-full items-center gap-2.5 rounded-[4px] px-2 text-[12.5px] transition-colors duration-100",
                  isMobile && "h-10",
                  isAct
                    ? "bg-white/[0.055] text-white"
                    : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200"
                )}
              >
                <Icon
                  className="h-[15px] w-[15px] shrink-0 stroke-[1.5px]"
                  style={{ color: isAct ? item.hue : undefined }}
                />
                <span className="flex-1 truncate text-left">{item.label}</span>
                <span className="num font-mono text-[10px] text-zinc-500">{item.count}</span>
              </button>
            );
          })}

          <div className="mx-2 my-2 h-px bg-white/[0.05]" />

          {quickAccessItems.map((item) => {
            const Icon = item.icon;
            const isAct = activeFilter === item.id;
            const showCount = item.count > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveFilter(item.id);
                  if (isMobile) setMobileSidebarOpen(false);
                }}
                aria-current={isAct ? "page" : undefined}
                className={cn(
                  "flex h-8 w-full items-center gap-2.5 rounded-[4px] px-2 text-[12.5px] transition-colors duration-100",
                  isMobile && "h-10",
                  isAct
                    ? "bg-white/[0.055] text-white"
                    : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200"
                )}
              >
                <Icon className="h-[15px] w-[15px] shrink-0 stroke-[1.5px]" style={{ color: item.hue }} />
                <span className="flex-1 truncate text-left">{item.label}</span>
                {showCount && (
                  <span className="num font-mono text-[10px] text-zinc-500">{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Folders */}
        <div className="mt-6 flex items-center justify-between px-1 pb-1.5">
          <span className="type-meta">Folders</span>
          <button
            type="button"
            onClick={() => setIsNewFolderOpen(true)}
            className="flex items-center gap-1 text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <Plus className="h-3 w-3 stroke-[1.75px]" />
            New
          </button>
        </div>

        <div className="space-y-px">
          {Object.values(customFolders).length === 0 ? (
            <p className="px-2 py-1 font-mono text-[10px] text-zinc-700">No folders yet</p>
          ) : (
            Object.values(customFolders).map((folder) => {
              const isAct = activeFilter === folder.id;
              return (
                <div
                  key={folder.id}
                  className={cn(
                    "group relative flex h-8 w-full items-center rounded-[4px] text-[12.5px] transition-colors",
                    isMobile && "h-10",
                    isAct ? "bg-white/[0.055] text-white" : "text-zinc-400 hover:bg-white/[0.03]"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFilter(folder.id);
                      if (isMobile) setMobileSidebarOpen(false);
                    }}
                    className="flex h-full flex-1 items-center gap-2.5 truncate px-2 text-left"
                  >
                    <Folder className="h-[15px] w-[15px] shrink-0 stroke-[1.5px] text-zinc-500" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCustomFolder(folder.id);
                    }}
                    className="mr-1 p-1.5 text-zinc-700 opacity-70 transition-all hover:text-rose-400 md:opacity-0 md:group-hover:opacity-100"
                    aria-label={`Delete folder ${folder.name}`}
                  >
                    <Trash2 className="h-3 w-3 stroke-[1.5px]" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer — honest numbers only */}
      <div className="shrink-0 border-t border-white/[0.05] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="num flex items-baseline justify-between font-mono text-[10px] text-zinc-500">
          <span>{files.length.toLocaleString()} files</span>
          <span>{formatBytes(totalIndexedBytes)}</span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isMobile) setMobileSidebarOpen(false);
            setIsAccountSwitcherOpen(true);
          }}
          className="group mt-3 flex w-full items-center gap-2.5 rounded-[4px] py-1 text-left transition-colors"
          title="Switch account"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.07] font-mono text-[10px] font-medium text-zinc-200">
            {user?.firstName ? user.firstName[0].toUpperCase() : "U"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium leading-tight text-zinc-200 group-hover:text-white">
              {user?.firstName || "Telegram user"}
              {user?.lastName ? ` ${user.lastName}` : ""}
            </span>
            <span className="block truncate font-mono text-[10px] leading-tight text-zinc-500">
              {user?.username ? `@${user.username}` : `id ${user?.id || "—"}`}
            </span>
          </span>
          <Users className="h-3.5 w-3.5 shrink-0 text-zinc-700 transition-colors group-hover:text-zinc-400" />
        </button>

        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (isMobile) setMobileSidebarOpen(false);
              setNetworkMonitorOpen(true);
            }}
            className="flex items-center gap-1.5 py-1 text-[10px] font-mono text-zinc-500 transition-colors hover:text-zinc-300"
            title="Network diagnostics"
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-emerald-400" : "bg-zinc-600")} />
            {isConnected ? "Connected" : "Offline"}
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (isMobile) setMobileSidebarOpen(false);
                setSettingsOpen(true);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-[4px] text-zinc-600 transition-colors hover:bg-white/[0.05] hover:text-white"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-3.5 w-3.5 stroke-[1.5px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="z-30 hidden h-[100dvh] w-[272px] shrink-0 select-none flex-col border-r border-white/[0.05] bg-[#0b0b0e] md:flex">
        {renderContent(false)}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop with Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Slide-in Drawer with Spring Physics */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 380 }}
              className="relative z-10 flex h-full w-[84vw] max-w-[300px] flex-col overflow-hidden border-r border-white/[0.06] bg-[#0b0b0e] shadow-[0_0_60px_rgba(0,0,0,0.85)]"
            >
              {renderContent(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* New Folder Modal */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-[340px] border-white/[0.1] bg-[#121215] text-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-sm font-sans text-white">Create Virtual Folder</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Group files together locally without modifying Telegram chats.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-3 pt-2">
            <Input
              type="text"
              placeholder="e.g. Research Monographs, Physics"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              className="h-10 sm:h-9 bg-white/[0.03] border-white/[0.1] text-base sm:text-xs text-zinc-100 placeholder:text-zinc-500 rounded-[4px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsNewFolderOpen(false)}
                className="text-xs hover:bg-white/[0.06] rounded-[4px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.15] rounded-[4px]"
              >
                Create Folder
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Account Switcher Dialog */}
      <AccountSwitcherDialog
        isOpen={isAccountSwitcherOpen}
        onClose={() => setIsAccountSwitcherOpen(false)}
        onOpenExport={() => setIsSessionExportOpen(true)}
      />

      {/* Session Export Modal */}
      <SessionExportModal
        isOpen={isSessionExportOpen}
        onClose={() => setIsSessionExportOpen(false)}
      />
    </>
  );
};
