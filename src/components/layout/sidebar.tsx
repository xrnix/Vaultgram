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
  HardDrive,
  Bookmark,
  ArrowUpDown,
  X,
  Users,
  Activity,
  Settings,
} from "lucide-react";
import { AccountSwitcherDialog } from "@/components/drive/account-switcher-dialog";
import { SessionExportModal } from "@/components/drive/session-export-modal";
import { cn, formatBytes } from "@/lib/utils";

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

  const { user } = useAuthStore();
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

  const navItems: { id: NavFilter; indexStr: string; label: string; icon: React.FC<any>; count: number; colorClass: string }[] = [
    { id: "ALL", indexStr: "01", label: "All Files", icon: Files, count: counts.ALL, colorClass: "text-zinc-400 group-hover:text-zinc-100" },
    { id: "IMAGE", indexStr: "02", label: "Images", icon: Image, count: counts.IMAGE, colorClass: "text-zinc-400 group-hover:text-zinc-100" },
    { id: "VIDEO", indexStr: "03", label: "Videos", icon: Video, count: counts.VIDEO, colorClass: "text-zinc-400 group-hover:text-zinc-100" },
    { id: "DOC", indexStr: "04", label: "Documents", icon: FileText, count: counts.DOC, colorClass: "text-zinc-400 group-hover:text-zinc-100" },
    { id: "ARCHIVE", indexStr: "05", label: "Archives", icon: Archive, count: counts.ARCHIVE, colorClass: "text-zinc-400 group-hover:text-zinc-100" },
    { id: "AUDIO", indexStr: "06", label: "Audio", icon: Music, count: counts.AUDIO, colorClass: "text-[#e6cfa3] group-hover:text-white" },
  ];

  const quickAccessItems: { id: NavFilter; indexStr: string; label: string; icon: React.FC<any>; count?: number; isBadge?: boolean; colorClass?: string }[] = [
    { id: "PINNED", indexStr: "07", label: "Pinned Items", icon: Pin, count: counts.PINNED, colorClass: "text-zinc-400 group-hover:text-zinc-100" },
    { id: "FAVORITES", indexStr: "08", label: "Favorites", icon: Star, count: counts.FAVORITES, colorClass: "text-[#c49b56]" },
    {
      id: "TRANSFERS",
      indexStr: "09",
      label: "Transfer Manager",
      icon: ArrowUpDown,
      count: activeTransfersCount > 0 ? activeTransfersCount : undefined,
      isBadge: activeTransfersCount > 0,
      colorClass: "text-zinc-400 group-hover:text-zinc-100",
    },
  ];

  const renderContent = (isMobile: boolean) => (
    <div className="flex h-full flex-col bg-[#121215] select-none text-zinc-300">
      {/* Mobile Drawer Header */}
      {isMobile && (
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.08] px-4 bg-[#121215]/95 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-white/[0.06] border border-white/[0.1] text-zinc-100 shadow-sm">
              <HardDrive className="h-3.5 w-3.5 stroke-[1.5px]" />
            </div>
            <span className="font-semibold text-xs tracking-tight text-white font-sans">
              Vaultgram
            </span>
            <span className="font-mono text-[9px] text-zinc-500 uppercase px-1.5 py-0.2 rounded-[2px] bg-white/[0.04] border border-white/[0.06]">
              MTProto
            </span>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-[3px] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4 stroke-[1.5px]" />
          </button>
        </div>
      )}

      {/* ZONE A: TOP CHANNEL CAROUSEL */}
      <div className="border-b border-white/[0.07] p-3 pb-2.5 bg-[#121215]/60">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase text-zinc-400 tracking-wider font-medium">
              Telegram Channels
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-zinc-500">
              {channels.length} synced
            </span>
            <button
              type="button"
              onClick={() => setCreateVaultOpen(true)}
              className="p-1 rounded-[3px] bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.08] transition-colors"
              title="Create new private storage vault"
            >
              <Plus className="h-3 w-3 text-[#c49b56]" />
            </button>
          </div>
        </div>

        {/* Gradient edge-fade carousel */}
        <div className="relative [mask-image:linear-gradient(to_right,transparent,black_8px,black_calc(100%-8px),transparent)]">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 px-1 touch-pan-x">
            {/* Create New Storage Vault Tile */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setCreateVaultOpen(true)}
              title="Create new private storage vault"
              className="relative flex shrink-0 items-center gap-1.5 rounded-[4px] px-2 py-1.5 text-xs bg-white/[0.02] text-zinc-400 border border-dashed border-white/[0.12] hover:text-white hover:border-white/[0.25] hover:bg-white/[0.05] transition-all"
            >
              <Plus className="h-3 w-3 stroke-[2px] text-[#c49b56]" />
              <span className="font-sans text-[11px]">New</span>
            </motion.button>

            {/* Unified View Tile */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveChannel("UNIFIED")}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-xs transition-colors",
                activeChannelId === "UNIFIED"
                  ? "text-white font-medium"
                  : "bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-zinc-200 hover:border-white/[0.12] hover:bg-white/[0.06]"
              )}
            >
              {activeChannelId === "UNIFIED" && (
                <motion.span
                  layoutId={isMobile ? "mobileActiveChannel" : "desktopActiveChannel"}
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  className="absolute inset-0 rounded-[4px] bg-white/[0.09] border border-white/[0.18] shadow-[0_0_12px_rgba(255,255,255,0.03)] -z-0"
                />
              )}
              <Layers className="relative z-10 h-3.5 w-3.5 shrink-0 stroke-[1.5px]" />
              <span className="relative z-10 truncate max-w-[85px]">All Channels</span>
            </motion.button>

            {/* Individual Channel Tiles */}
            {channels.map((ch) => {
              const isAct = activeChannelId === ch.id;
              return (
                <motion.button
                  key={ch.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveChannel(ch.id)}
                  title={ch.title}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 rounded-[4px] px-2 py-1.5 text-xs transition-colors",
                    isAct
                      ? "text-white font-medium"
                      : "bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-zinc-200 hover:border-white/[0.12] hover:bg-white/[0.06]"
                  )}
                >
                  {isAct && (
                    <motion.span
                      layoutId={isMobile ? "mobileActiveChannel" : "desktopActiveChannel"}
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      className="absolute inset-0 rounded-[4px] bg-white/[0.09] border border-white/[0.18] shadow-[0_0_12px_rgba(255,255,255,0.03)] -z-0"
                    />
                  )}
                  <div
                    className={cn(
                      "relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] text-[9px] font-mono",
                      isAct
                        ? "bg-white/[0.15] text-white"
                        : "bg-white/[0.05] text-zinc-400"
                    )}
                  >
                    {ch.isSelf ? <Bookmark className="h-2.5 w-2.5" /> : getInitials(ch.title)}
                  </div>
                  <span className="relative z-10 truncate max-w-[85px]">{ch.title}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ZONE B: NAVIGATION CATEGORIES & FOLDERS */}
      <ScrollArea className="flex-1 px-3 py-3">
        {/* Media Categories with Archival Index Pattern */}
        <div className="space-y-1">
          <span className="px-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-medium">
            Directory Indices
          </span>
          <div className="space-y-0.5 pt-1">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isAct = activeFilter === item.id;
              return (
                <motion.button
                  key={item.id}
                  initial={isMobile ? { opacity: 0, x: -12, filter: "blur(4px)" } : false}
                  animate={isMobile ? { opacity: 1, x: 0, filter: "blur(0px)" } : false}
                  transition={isMobile ? { duration: 0.25, delay: 0.03 + idx * 0.025 } : undefined}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveFilter(item.id)}
                  className={cn(
                    "relative flex h-8 w-full items-center justify-between px-2.5 rounded-[4px] text-xs transition-colors",
                    isAct
                      ? "text-white font-medium"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
                  )}
                >
                  {isAct && (
                    <motion.span
                      layoutId={isMobile ? "mobileActiveCategory" : "desktopActiveCategory"}
                      transition={{ type: "spring", stiffness: 480, damping: 36 }}
                      className="absolute inset-0 rounded-[4px] bg-white/[0.08] border border-white/[0.14] shadow-[0_0_12px_rgba(255,255,255,0.03)] -z-0"
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-zinc-500">{item.indexStr} ·</span>
                    <Icon className={cn("h-3.5 w-3.5 stroke-[1.5px] transition-colors", item.colorClass)} />
                    <span className="font-sans">{item.label}</span>
                  </div>
                  <span className="relative z-10 font-mono text-[10px] text-zinc-500 tabular-nums">
                    {item.count}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Quick Access */}
        <div className="mt-5 space-y-1">
          <span className="px-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-medium">
            System Faculties
          </span>
          <div className="space-y-0.5 pt-1">
            {quickAccessItems.map((item, idx) => {
              const Icon = item.icon;
              const isAct = activeFilter === item.id;
              return (
                <motion.button
                  key={item.id}
                  initial={isMobile ? { opacity: 0, x: -12, filter: "blur(4px)" } : false}
                  animate={isMobile ? { opacity: 1, x: 0, filter: "blur(0px)" } : false}
                  transition={isMobile ? { duration: 0.25, delay: 0.18 + idx * 0.025 } : undefined}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setActiveFilter(item.id)}
                  className={cn(
                    "relative flex h-8 w-full items-center justify-between px-2.5 rounded-[4px] text-xs transition-colors",
                    isAct
                      ? "text-white font-medium"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]"
                  )}
                >
                  {isAct && (
                    <motion.span
                      layoutId={isMobile ? "mobileActiveQuickAccess" : "desktopActiveQuickAccess"}
                      transition={{ type: "spring", stiffness: 480, damping: 36 }}
                      className="absolute inset-0 rounded-[4px] bg-white/[0.08] border border-white/[0.14] shadow-[0_0_12px_rgba(255,255,255,0.03)] -z-0"
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-zinc-500">{item.indexStr} ·</span>
                    <Icon className={cn("h-3.5 w-3.5 stroke-[1.5px] transition-colors", item.colorClass)} />
                    <span className="font-sans">{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span
                      className={cn(
                        "relative z-10 font-mono text-[10px] tabular-nums",
                        item.isBadge
                          ? "px-1.5 py-0.2 rounded-full bg-white/[0.08] text-white border border-white/[0.16]"
                          : "text-zinc-500"
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Custom Virtual Folders */}
        <div className="mt-5 space-y-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-medium">
              Virtual Dossiers
            </span>
            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Plus className="h-3 w-3 stroke-[1.75px]" />
              <span>New</span>
            </button>
          </div>

          <div className="space-y-0.5 pt-1">
            {Object.values(customFolders).length === 0 ? (
              <div className="px-2.5 py-1 text-[11px] text-zinc-600 font-mono">
                No custom dossiers
              </div>
            ) : (
              Object.values(customFolders).map((folder) => {
                const isAct = activeFilter === folder.id;
                return (
                  <div
                    key={folder.id}
                    className={cn(
                      "group relative flex h-8 w-full items-center justify-between px-2.5 rounded-[4px] text-xs transition-colors",
                      isAct
                        ? "text-white font-medium"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
                    )}
                  >
                    {isAct && (
                      <div className="absolute inset-0 rounded-[4px] bg-white/[0.08] border border-white/[0.14] -z-0" />
                    )}
                    <button
                      onClick={() => setActiveFilter(folder.id)}
                      className="relative z-10 flex flex-1 items-center gap-2 text-left truncate"
                    >
                      <Folder className="h-3.5 w-3.5 shrink-0 stroke-[1.5px] text-zinc-400" />
                      <span className="truncate">{folder.name}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCustomFolder(folder.id);
                      }}
                      className="relative z-10 opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity p-0.5"
                    >
                      <Trash2 className="h-3 w-3 stroke-[1.5px]" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ScrollArea>

      {/* ZONE C: HARDWARE TELEMETRY FOOTER */}
      <div className="border-t border-white/[0.07] p-3 bg-[#121215]/95 space-y-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* Active Account Deck */}
        <div
          onClick={() => setIsAccountSwitcherOpen(true)}
          className="group flex items-center justify-between p-2 rounded-[4px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.14] transition-all cursor-pointer"
          title="Switch Account / Manage Profiles"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.08] border border-white/[0.15] text-white text-[10px] font-mono font-medium">
              {user?.firstName ? user.firstName[0].toUpperCase() : "U"}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-white truncate flex items-center gap-1">
                <span>{user?.firstName || "Telegram User"}</span>
                {user?.lastName && <span className="text-zinc-400">{user.lastName}</span>}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono truncate">
                {user?.username ? `@${user.username}` : `ID: ${user?.id || "MTProto"}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <Users className="h-3.5 w-3.5 stroke-[1.5px]" />
          </div>
        </div>

        {/* Milled Hardware Telemetry Deck */}
        <div className="specimen-card hairline-sheen space-y-2 rounded-[5px] p-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400 flex items-center gap-1.5 font-medium tracking-tight">
              <HardDrive className="h-3 w-3 text-zinc-500 stroke-[1.5px]" />
              Archival Volume
            </span>
            <span className="text-zinc-200 font-semibold tabular-nums tracking-tight">
              {formatBytes(totalIndexedBytes)}
            </span>
          </div>

          {/* Precision Machined Gauge */}
          <div className="h-1.5 w-full bg-[#0c0c0e] border border-white/[0.05] rounded-none overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-zinc-500 via-[#c49b56] to-[#e6cfa3] transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.max(3, (files.length / 150) * 100))}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono tracking-tight">
            <span className="tabular-nums">{files.length} indexed records</span>
            <span className="text-zinc-600 uppercase tracking-wider text-[9px]">MTProto Buffer</span>
          </div>
        </div>

        {/* Connection Status & Control Deck */}
        <div className="flex items-center justify-between pt-0.5">
          <button
            type="button"
            onClick={() => setNetworkMonitorOpen(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-300 font-medium hover:text-white transition-colors group cursor-pointer"
            title="View MTProto Network & DC Latency Telemetry"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white/90"></span>
            </span>
            <span className="text-[11px] font-mono tracking-tight text-zinc-400 group-hover:text-white">Vaultgram</span>
            <Activity className="h-3 w-3 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (isMobile) setMobileSidebarOpen(false);
              setSettingsOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.18] transition-colors text-xs font-mono"
            title="Settings & Preferences"
          >
            <Settings className="h-3.5 w-3.5 stroke-[1.5px]" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex h-screen w-72 flex-col border-r border-white/[0.07] bg-[#121215] select-none shrink-0 z-30">
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
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="relative z-10 flex h-full w-[84vw] max-w-[310px] flex-col border-r border-white/[0.08] bg-[#121215] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
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
              className="bg-white/[0.03] border-white/[0.1] text-xs text-zinc-100 placeholder:text-zinc-500 rounded-[4px]"
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
