import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { SpringHamburger } from "@/components/ui/spring-hamburger";
import { CommandPalette } from "./command-palette";
import { cn } from "@/lib/utils";

interface DriveToolbarProps {
  onTriggerUpload: () => void;
}

export const DriveToolbar: React.FC<DriveToolbarProps> = ({ onTriggerUpload }) => {
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
    setViewMode,
    setSorting,
    refreshIndex,
    setMobileSidebarOpen,
  } = useDriveStore();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0a0c10]/80 px-2.5 sm:px-4 backdrop-blur-xl select-none gap-1 sm:gap-2 z-20">
        {/* Left: Spring Morph Hamburger + Archival Breadcrumb */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0 min-w-0">
          {/* Animated Spring Morph Hamburger Icon on Mobile */}
          <div className="md:hidden shrink-0">
            <SpringHamburger
              isOpen={isMobileSidebarOpen}
              onClick={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
            />
          </div>

          {/* Archival Breadcrumb */}
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 text-xs">
            <span
              className="font-mono text-[10px] sm:text-xs text-zinc-400 max-w-[70px] xs:max-w-[100px] sm:max-w-[140px] truncate"
              title={getChannelTitle()}
            >
              {getChannelTitle()}
            </span>
            <ChevronRight className="h-3 w-3 text-zinc-600 stroke-[1.5px] shrink-0" />
            <span
              className="font-sans font-medium text-white max-w-[65px] xs:max-w-[90px] sm:max-w-none truncate"
              title={getCategoryLabel()}
            >
              {getCategoryLabel()}
            </span>
          </div>

          {/* Live Background Sync Status Pill */}
          {syncStatus.isSyncing && (
            <div className="ml-1 sm:ml-2 flex items-center gap-1.5 rounded-[3px] bg-white/[0.04] border border-white/[0.08] px-1.5 sm:px-2 py-0.5 text-[10px] font-mono text-zinc-400 animate-pulse shrink-0">
              <RefreshCw className="h-2.5 w-2.5 animate-spin text-zinc-300" />
              <span className="hidden sm:inline truncate max-w-[160px]">{syncStatus.statusText}</span>
            </div>
          )}
        </div>

        {/* Center: Search Capsule with ⌘K Command Trigger */}
        <div className="flex-1 min-w-[100px] max-w-xs sm:max-w-sm md:max-w-md mx-1 sm:mx-2">
          <div
            onClick={() => setIsCommandPaletteOpen(true)}
            className="group relative flex items-center cursor-pointer"
          >
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200 stroke-[1.5px] pointer-events-none transition-colors" />
            <Input
              type="text"
              readOnly
              placeholder="Search or press ⌘K..."
              value={searchQuery}
              className="h-8 pl-8 pr-12 sm:pr-20 text-xs bg-white/[0.03] group-hover:bg-white/[0.06] border-white/[0.08] group-hover:border-white/[0.18] rounded-[5px] placeholder:text-zinc-500 text-zinc-200 cursor-pointer transition-all w-full"
            />

            {/* Keyboard shortcut badge */}
            <div className="absolute right-2 flex items-center gap-1 pointer-events-none">
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-[3px] border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[9px] font-medium text-zinc-400">
                <Command className="h-2.5 w-2.5" /> K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right: Controls & Translucent Upload CTA */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Refresh Index Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refreshIndex()}
            disabled={syncStatus.isSyncing}
            title="Refresh MTProto Index"
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-[4px]"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5 stroke-[1.5px]",
                syncStatus.isSyncing && "animate-spin text-white"
              )}
            />
          </Button>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                title={`Sort by ${sortField} (${sortOrder.toUpperCase()})`}
                className="h-8 px-2 sm:px-2.5 gap-1.5 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.16] text-xs text-zinc-300 hover:text-white rounded-[4px] transition-colors"
              >
                <ArrowUpDown className="h-3 w-3 stroke-[1.5px] text-zinc-400" />
                <span className="hidden md:inline capitalize">
                  {sortField} ({sortOrder.toUpperCase()})
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-[#0c0e14] border-white/[0.1] text-zinc-300">
              <DropdownMenuItem onClick={() => setSorting("date")} className="hover:bg-white/[0.06] hover:text-white text-xs">
                <span>Date {sortField === "date" ? `(${sortOrder.toUpperCase()})` : ""}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSorting("name")} className="hover:bg-white/[0.06] hover:text-white text-xs">
                <span>Name {sortField === "name" ? `(${sortOrder.toUpperCase()})` : ""}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSorting("size")} className="hover:bg-white/[0.06] hover:text-white text-xs">
                <span>Size {sortField === "size" ? `(${sortOrder.toUpperCase()})` : ""}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Toggle (Grid / List) */}
          <div className="flex items-center rounded-[4px] border border-white/[0.08] bg-white/[0.03] p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={cn(
                "relative flex h-7 w-7 items-center justify-center rounded-[3px] transition-colors",
                viewMode === "grid"
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {viewMode === "grid" && (
                <motion.span
                  layoutId="viewModePill"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  className="absolute inset-0 rounded-[3px] bg-white/[0.1] border border-white/[0.14] shadow-sm -z-0"
                />
              )}
              <LayoutGrid className="relative z-10 h-3.5 w-3.5 stroke-[1.5px]" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="List View"
              className={cn(
                "relative flex h-7 w-7 items-center justify-center rounded-[3px] transition-colors",
                viewMode === "list"
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {viewMode === "list" && (
                <motion.span
                  layoutId="viewModePill"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  className="absolute inset-0 rounded-[3px] bg-white/[0.1] border border-white/[0.14] shadow-sm -z-0"
                />
              )}
              <List className="relative z-10 h-3.5 w-3.5 stroke-[1.5px]" />
            </button>
          </div>

          {/* Upload File CTA (Translucent Glass Button from Research Press) */}
          <Button
            onClick={onTriggerUpload}
            size="sm"
            className="h-8 px-2.5 sm:px-3 gap-1.5 bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.18] hover:border-white/30 font-medium text-xs rounded-[4px] shadow-[0_0_15px_rgba(255,255,255,0.03)] active:scale-[0.97] transition-all"
          >
            <Upload className="h-3.5 w-3.5 stroke-[1.75px]" />
            <span className="hidden xs:inline">Upload</span>
          </Button>
        </div>
      </header>

      {/* Global ⌘K Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onTriggerUpload={onTriggerUpload}
      />
    </>
  );
};
