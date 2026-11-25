import React, { useState, useEffect } from "react";
import { useDriveStore } from "@/lib/stores/drive-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  LayoutGrid,
  List,
  ArrowUpDown,
  Upload,
  RefreshCw,
  ChevronRight,
  Command,
  Settings,
} from "lucide-react";
import { SpringHamburger } from "@/components/ui/spring-hamburger";
import { CommandPalette } from "./command-palette";
import { AccountSwitcherDialog } from "./account-switcher-dialog";
import { SessionExportModal } from "./session-export-modal";
import { SettingsModal } from "./settings-modal";
import { MediaGlyph } from "./media-glyph";
import { isMediaCategory } from "@/lib/media-tokens";
import { cn } from "@/lib/utils";

interface DriveToolbarProps {
  onTriggerUpload: () => void;
  hideHeader?: boolean;
}

export const DriveToolbar: React.FC<DriveToolbarProps> = ({
  onTriggerUpload,
  hideHeader = false,
}) => {
  const {
    channels,
    activeChannelId,
    activeFilter,
    customFolders,
    searchQuery,
    viewMode,
    sortField,
    sortOrder,
    syncStatus,
    isMobileSidebarOpen,
    isSettingsOpen,
    isCommandPaletteOpen,
    setViewMode,
    setSorting,
    refreshIndex,
    setMobileSidebarOpen,
    setSettingsOpen,
    setCommandPaletteOpen,
  } = useDriveStore();

  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const [isSessionExportOpen, setIsSessionExportOpen] = useState(false);

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!useDriveStore.getState().isCommandPaletteOpen);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setCommandPaletteOpen]);

  const getChannelTitle = () => {
    if (activeChannelId === "UNIFIED") return "All Channels";
    const ch = channels.find((c) => c.id === activeChannelId);
    return ch?.title || "Channel";
  };

  const getCategoryLabel = () => {
    switch (activeFilter) {
      case "ALL":
        return "All Files";
      case "IMAGE":
        return "Images";
      case "VIDEO":
        return "Videos";
      case "DOC":
        return "Documents";
      case "ARCHIVE":
        return "Archives";
      case "AUDIO":
        return "Audio";
      case "PINNED":
        return "Pinned";
      case "FAVORITES":
        return "Favorites";
      case "TRANSFERS":
        return "Transfers";
      default:
        return customFolders[activeFilter]?.name || "Folder";
    }
  };

  const activeCategoryToken = isMediaCategory(activeFilter) ? activeFilter : null;

  return (
    <>
      {!hideHeader && (
        <header className="relative z-20 flex h-[calc(3rem+env(safe-area-inset-top))] shrink-0 select-none items-center gap-2 border-b border-white/[0.05] bg-[#0b0b0e]/85 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:px-4">
          {/* Left: menu + breadcrumb */}
          <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:flex-initial sm:gap-2">
            <div className="shrink-0 md:hidden">
              <SpringHamburger
                isOpen={isMobileSidebarOpen}
                onClick={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
              />
            </div>

            <div className="flex min-w-0 flex-col leading-tight sm:flex-row sm:items-center sm:gap-1.5">
              <span
                className="max-w-[170px] truncate text-[12.5px] font-medium tracking-[-0.005em] text-zinc-100 sm:max-w-[160px]"
                title={getChannelTitle()}
              >
                {getChannelTitle()}
              </span>
              <ChevronRight className="hidden h-3 w-3 shrink-0 text-zinc-700 sm:inline-block" />
              <span
                className="flex min-w-0 items-center gap-1 truncate font-mono text-[10px] text-zinc-500 sm:text-[11.5px]"
                title={getCategoryLabel()}
              >
                {activeCategoryToken && (
                  <MediaGlyph category={activeCategoryToken} className="h-3 w-3" strokeWidth={1.6} />
                )}
                <span className="truncate">{getCategoryLabel()}</span>
              </span>
            </div>

            {/* Sync state — a whisper, not a pill */}
            {syncStatus.isSyncing && (
              <div className="ml-1 flex shrink-0 items-center gap-1.5 text-[10px] text-zinc-500">
                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                <span className="hidden max-w-[140px] truncate lg:inline">{syncStatus.statusText}</span>
              </div>
            )}
          </div>

          {/* Center: search — reads as a recessed field, not a button */}
          <div className="mx-2 hidden min-w-[120px] max-w-xs flex-1 sm:flex md:max-w-md">
            <div
              onClick={() => setCommandPaletteOpen(true)}
              className="group relative flex w-full cursor-pointer items-center"
            >
              <Search className="pointer-events-none absolute left-2.5 top-[9px] h-3.5 w-3.5 text-zinc-600 transition-colors group-hover:text-zinc-400" />
              <Input
                type="text"
                readOnly
                placeholder="Search files or press ⌘K"
                value={searchQuery}
                className="h-8 w-full cursor-pointer rounded-[4px] border-0 bg-white/[0.035] pl-8 pr-16 text-[11.5px] text-zinc-300 transition-colors placeholder:text-zinc-600 group-hover:bg-white/[0.055] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/[0.15]"
              />
              <div className="pointer-events-none absolute right-2 flex items-center gap-1">
                <kbd className="tactile-keycap hidden items-center gap-0.5 rounded-[3px] px-1.5 py-0.5 font-mono text-[9px] text-zinc-500 md:inline-flex">
                  <Command className="h-2.5 w-2.5" /> K
                </kbd>
              </div>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refreshIndex()}
              disabled={syncStatus.isSyncing}
              title="Refresh index"
              className="hidden h-8 w-8 rounded-[4px] text-zinc-500 hover:bg-white/[0.05] hover:text-white sm:flex"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5 stroke-[1.5px]",
                  syncStatus.isSyncing && "animate-spin text-white"
                )}
              />
            </Button>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title={`Sort by ${sortField} (${sortOrder.toUpperCase()})`}
                  className="flex h-9 w-9 items-center justify-center gap-1.5 rounded-[4px] text-[11.5px] text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200 sm:h-8 sm:w-auto sm:px-2"
                >
                  <ArrowUpDown className="h-4 w-4 stroke-[1.5px] sm:h-3.5 sm:w-3.5" />
                  <span className="hidden capitalize md:inline">
                    {sortField} <span className="text-zinc-600">{sortOrder.toUpperCase()}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 border-white/[0.08] bg-[#131317] text-zinc-300">
                <DropdownMenuItem onClick={() => setSorting("date")} className="py-2 text-xs hover:bg-white/[0.05] hover:text-white sm:py-1.5">
                  <span>Date {sortField === "date" ? `(${sortOrder.toUpperCase()})` : ""}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSorting("name")} className="py-2 text-xs hover:bg-white/[0.05] hover:text-white sm:py-1.5">
                  <span>Name {sortField === "name" ? `(${sortOrder.toUpperCase()})` : ""}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSorting("size")} className="py-2 text-xs hover:bg-white/[0.05] hover:text-white sm:py-1.5">
                  <span>Size {sortField === "size" ? `(${sortOrder.toUpperCase()})` : ""}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => refreshIndex()} className="mt-1 border-t border-white/[0.06] py-2 pt-2 text-xs hover:bg-white/[0.05] hover:text-white sm:hidden">
                  <RefreshCw className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                  <span>Sync index</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View toggle — mobile */}
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              title={`Switch to ${viewMode === "grid" ? "list" : "grid"} view`}
              className="flex h-9 w-9 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-white active:scale-95 sm:hidden"
            >
              {viewMode === "grid" ? (
                <List className="h-4 w-4 stroke-[1.5px]" />
              ) : (
                <LayoutGrid className="h-4 w-4 stroke-[1.5px]" />
              )}
            </button>

            {/* View toggle — desktop segmented */}
            <div className="hidden items-center gap-0.5 rounded-[4px] bg-white/[0.04] p-0.5 sm:flex">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid view"
                aria-pressed={viewMode === "grid"}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-[3px] transition-colors",
                  viewMode === "grid"
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-600 hover:text-zinc-300"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5 stroke-[1.5px]" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="List view"
                aria-pressed={viewMode === "list"}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-[3px] transition-colors",
                  viewMode === "list"
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-600 hover:text-zinc-300"
                )}
              >
                <List className="h-3.5 w-3.5 stroke-[1.5px]" />
              </button>
            </div>

            {/* Upload — the one primary action on screen */}
            <Button
              onClick={onTriggerUpload}
              size="sm"
              className="ml-0.5 hidden h-8 gap-1.5 rounded-[4px] border border-[#e8d5b5]/35 bg-[linear-gradient(180deg,#e9d3a4_0%,#c9a25c_100%)] px-3 text-[11.5px] font-semibold text-[#17130b] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_1px_2px_rgba(0,0,0,0.6)] transition-all hover:brightness-[1.06] active:translate-y-px md:flex"
              title="Upload a file"
            >
              <Upload className="h-3.5 w-3.5 stroke-[2px]" />
              <span>Upload</span>
            </Button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="ml-0.5 flex h-9 w-9 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-white sm:h-8 sm:w-8"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4 stroke-[1.5px]" />
            </button>
          </div>
        </header>
      )}

      {/* Global ⌘K Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onTriggerUpload={onTriggerUpload}
        onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
        onOpenExport={() => setIsSessionExportOpen(true)}
      />

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

      {/* Unified Settings & Preferences Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
        onOpenExport={() => setIsSessionExportOpen(true)}
      />
    </>
  );
};
