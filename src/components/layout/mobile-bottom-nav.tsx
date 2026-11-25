import React from "react";
import { useDriveStore } from "@/lib/stores/drive-store";
import { useTransferStore } from "@/lib/stores/transfer-store";
import {
  HardDrive,
  Search,
  Upload,
  ArrowUpDown,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onTriggerUpload: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onTriggerUpload,
}) => {
  const {
    activeFilter,
    isMobileSidebarOpen,
    setActiveFilter,
    setMobileSidebarOpen,
    setCommandPaletteOpen,
  } = useDriveStore();

  const { tasks } = useTransferStore();
  const activeTransfersCount = tasks.filter(
    (t) => t.status === "ACTIVE" || t.status === "QUEUED"
  ).length;

  const isDriveActive = activeFilter !== "TRANSFERS" && !isMobileSidebarOpen;
  const isTransfersActive = activeFilter === "TRANSFERS" && !isMobileSidebarOpen;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/[0.08] bg-[#121215]/95 backdrop-blur-xl select-none pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-14 items-center px-1">
        {/* Drive */}
        <button
          type="button"
          onClick={() => {
            setMobileSidebarOpen(false);
            if (activeFilter === "TRANSFERS") {
              setActiveFilter("ALL");
            }
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 h-full min-h-[44px] rounded-[4px] transition-colors active:scale-95",
            isDriveActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <HardDrive
            className={cn(
              "h-4 w-4 stroke-[1.6px]",
              isDriveActive && "text-white"
            )}
          />
          <span className="text-[10px] font-mono tracking-tight">Drive</span>
        </button>

        {/* Search */}
        <button
          type="button"
          onClick={() => {
            setMobileSidebarOpen(false);
            setCommandPaletteOpen(true);
          }}
          className="flex flex-col items-center justify-center gap-0.5 h-full min-h-[44px] rounded-[4px] text-zinc-500 hover:text-zinc-200 transition-colors active:scale-95"
        >
          <Search className="h-4 w-4 stroke-[1.6px]" />
          <span className="text-[10px] font-mono tracking-tight">Search</span>
        </button>

        {/* Upload CTA */}
        <div className="flex items-center justify-center h-full">
          <button
            type="button"
            onClick={onTriggerUpload}
            aria-label="Upload file"
            className="flex h-10 w-12 items-center justify-center rounded-[5px] bg-white/[0.1] border border-white/[0.2] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] active:scale-95 transition-transform"
          >
            <Upload className="h-4 w-4 stroke-[1.8px]" />
          </button>
        </div>

        {/* Transfers */}
        <button
          type="button"
          onClick={() => {
            setMobileSidebarOpen(false);
            setActiveFilter("TRANSFERS");
          }}
          className={cn(
            "relative flex flex-col items-center justify-center gap-0.5 h-full min-h-[44px] rounded-[4px] transition-colors active:scale-95",
            isTransfersActive
              ? "text-white"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <div className="relative">
            <ArrowUpDown className="h-4 w-4 stroke-[1.6px]" />
            {activeTransfersCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-[3px] bg-[#e6cfa3] px-1 font-mono text-[9px] font-semibold text-black tabular-nums">
                {activeTransfersCount > 9 ? "9+" : activeTransfersCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono tracking-tight">Queue</span>
        </button>

        {/* Vaults / Sidebar Drawer */}
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(!isMobileSidebarOpen)}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 h-full min-h-[44px] rounded-[4px] transition-colors active:scale-95",
            isMobileSidebarOpen
              ? "text-white"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Layers className="h-4 w-4 stroke-[1.6px]" />
          <span className="text-[10px] font-mono tracking-tight">Vaults</span>
        </button>
      </div>
    </nav>
  );
};
