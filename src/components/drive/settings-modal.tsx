import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Settings,
  Download,
  Users,
  Activity,
  Keyboard,
  LogOut,
  SlidersHorizontal,
  KeyRound,
  PieChart,
  RefreshCw,
  FolderPlus,
  Trash2,
  LayoutGrid,
  List,
  Shield,
} from "lucide-react";
import { useDriveStore } from "@/lib/stores/drive-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useChannelWizardStore } from "@/lib/stores/channel-wizard-store";
import { useTransferStore } from "@/lib/stores/transfer-store";
import { clearAllChannelFilesFromDb } from "@/lib/telegram/session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAccountSwitcher?: () => void;
  onOpenExport?: () => void;
}

type SettingsSection = "general" | "transfers" | "storage" | "account" | "diagnostics";

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenAccountSwitcher,
  onOpenExport,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [isPurgingCache, setIsPurgingCache] = useState(false);

  const {
    channels,
    files,
    viewMode,
    setViewMode,
    showTransferDock,
    setShowTransferDock,
    setActiveFilter,
    setAnalyticsOpen,
    setCreateVaultOpen,
    setNetworkMonitorOpen,
    setShortcutsOpen,
    refreshIndex,
  } = useDriveStore();

  const { user, logout } = useAuthStore();
  const { resetWizard } = useChannelWizardStore();
  const { tasks, clearCompleted } = useTransferStore();

  if (!isOpen) return null;

  const activeTransfers = tasks.filter((t) => t.status === "ACTIVE" || t.status === "QUEUED").length;

  const handlePurgeCache = async () => {
    if (!window.confirm("Purge local IndexedDB cache? Vaultgram will re-index your Telegram channels on next load.")) {
      return;
    }
    setIsPurgingCache(true);
    try {
      await clearAllChannelFilesFromDb();
      toast.success("Local catalog cache purged. Re-indexing channels...");
      onClose();
      await refreshIndex();
    } catch (e: any) {
      toast.error(e?.message || "Failed to purge cache");
    } finally {
      setIsPurgingCache(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="relative z-10 flex flex-col w-full max-w-2xl max-h-[90vh] bg-[#121215] border border-white/[0.1] rounded-[8px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden backdrop-blur-2xl"
        >
          {/* Top Hairline Sheen */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.08] bg-[#121215]/95 shrink-0">
            <div className="flex items-center gap-3 min-w-0 mr-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white/[0.04] border border-white/[0.08] text-[#e6cfa3] shrink-0">
                <Settings className="h-4.5 w-4.5 stroke-[1.5px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-medium font-sans text-white truncate">
                  Vaultgram Preferences &amp; Settings
                </h2>
                <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  Decentralized Telegram Cloud Management
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-[4px] transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4 stroke-[1.5px]" />
            </button>
          </div>

          {/* Navigation Sub-Tabs (Scrollable horizontally on mobile with Spring Underline) */}
          <div className="flex items-center border-b border-white/[0.06] bg-[#0d0d10] px-4 sm:px-6 gap-1 overflow-x-auto no-scrollbar shrink-0">
            {[
              { id: "general", label: "General" },
              { id: "transfers", label: "Downloads & Queue" },
              { id: "storage", label: "Storage & Vaults" },
              { id: "account", label: "Account" },
              { id: "diagnostics", label: "Diagnostics" },
            ].map((tab) => {
              const isAct = activeSection === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActiveSection(tab.id as SettingsSection)}
                  className={`relative py-2.5 px-3 text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                    isAct ? "text-[#e6cfa3]" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <span className="relative z-10">{tab.label}</span>
                  {isAct && (
                    <motion.span
                      layoutId="activeSettingsTabUnderline"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      className="absolute bottom-0 inset-x-1 h-[2px] bg-[#c49b56] rounded-full shadow-[0_0_8px_rgba(196,155,86,0.5)]"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Body Content with AnimatePresence */}
          <div className="p-5 sm:p-7 overflow-y-auto no-scrollbar space-y-6 text-xs font-sans bg-[#09090b] flex-1">
            <AnimatePresence mode="wait">
              {/* 1. GENERAL TAB */}
              {activeSection === "general" && (
                <motion.div
                  key="general"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-4"
                >
                  {/* View Mode Selection */}
                  <div className="specimen-card hairline-sheen rounded-[6px] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-medium text-white block">Default View Layout</span>
                        <span className="text-[11px] text-zinc-500 font-sans block mt-0.5">
                          Choose how files are presented across Vaultgram folders.
                        </span>
                      </div>

                      <div className="flex items-center rounded-[5px] border border-white/[0.08] bg-white/[0.03] p-0.5">
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setViewMode("grid")}
                          className={cn(
                            "relative flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-mono transition-colors",
                            viewMode === "grid" ? "text-white font-medium" : "text-zinc-400 hover:text-zinc-200"
                          )}
                        >
                          {viewMode === "grid" && (
                            <motion.span
                              layoutId="settingsViewModePill"
                              transition={{ type: "spring", stiffness: 450, damping: 32 }}
                              className="absolute inset-0 rounded-[4px] bg-white/[0.12] border border-white/[0.18] shadow-sm -z-0"
                            />
                          )}
                          <LayoutGrid className="relative z-10 w-3.5 h-3.5" />
                          <span className="relative z-10">Grid</span>
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setViewMode("list")}
                          className={cn(
                            "relative flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-mono transition-colors",
                            viewMode === "list" ? "text-white font-medium" : "text-zinc-400 hover:text-zinc-200"
                          )}
                        >
                          {viewMode === "list" && (
                            <motion.span
                              layoutId="settingsViewModePill"
                              transition={{ type: "spring", stiffness: 450, damping: 32 }}
                              className="absolute inset-0 rounded-[4px] bg-white/[0.12] border border-white/[0.18] shadow-sm -z-0"
                            />
                          )}
                          <List className="relative z-10 w-3.5 h-3.5" />
                          <span className="relative z-10">List</span>
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Keyboard Shortcuts */}
                  <div className="specimen-card hairline-sheen rounded-[6px] p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-white block">Keyboard Shortcuts Reference</span>
                      <span className="text-[11px] text-zinc-500 font-sans block mt-0.5">
                        View hotkeys for rapid navigation, cinema player, and batch management.
                      </span>
                    </div>
                    <motion.div whileTap={{ scale: 0.96 }}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onClose();
                          setShortcutsOpen(true);
                        }}
                        className="h-8 px-3 text-xs rounded-[5px] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border-white/[0.1] gap-1.5 shrink-0"
                      >
                        <Keyboard className="w-3.5 h-3.5" />
                        <span>View Hotkeys</span>
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}

            {/* 2. TRANSFERS & DOWNLOADS TAB */}
            {activeSection === "transfers" && (
              <motion.div
                key="transfers"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-4"
              >
                {/* Removable Download Bar / Transfer Dock Toggle */}
                <div className="specimen-card hairline-sheen rounded-[6px] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white">Floating Download &amp; Transfer Queue</span>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#e6cfa3] bg-[#c49b56]/15 px-1.5 py-0.2 rounded-[2px] border border-[#c49b56]/30">
                          Toggle
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                        Show the bottom-right real-time upload and download progress widget. You can turn this off anytime to keep your canvas completely distraction-free.
                      </p>
                    </div>

                    {/* Toggle Switch with Apple Spring Physics */}
                    <motion.button
                      type="button"
                      role="switch"
                      whileTap={{ scale: 0.92 }}
                      aria-checked={showTransferDock}
                      onClick={() => {
                        const next = !showTransferDock;
                        setShowTransferDock(next);
                        toast.success(next ? "Download dock enabled" : "Download dock hidden");
                      }}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full p-[2px] transition-colors duration-200 ease-in-out focus:outline-none",
                        showTransferDock ? "bg-[#c49b56] shadow-[0_0_12px_rgba(196,155,86,0.4)]" : "bg-white/[0.1]"
                      )}
                    >
                      <motion.span
                        layout
                        transition={{ type: "spring", stiffness: 600, damping: 35 }}
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md",
                          showTransferDock ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </motion.button>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span>Active tasks: {activeTransfers}</span>
                    <span>Total queued: {tasks.length}</span>
                  </div>
                </div>

                {/* Full-Page Transfers Manager View */}
                <div className="specimen-card hairline-sheen rounded-[6px] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-white block">Dedicated Transfers Page</span>
                    <span className="text-[11px] text-zinc-500 font-sans block mt-0.5">
                      Switch main canvas to the full Transfer Manager to inspect speed, pause, or resume all tasks.
                    </span>
                  </div>
                  <motion.div whileTap={{ scale: 0.96 }}>
                    <Button
                      size="sm"
                      onClick={() => {
                        onClose();
                        setActiveFilter("TRANSFERS");
                      }}
                      className="h-8 px-3 text-xs rounded-[5px] bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.14] gap-1.5 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Open Transfers</span>
                    </Button>
                  </motion.div>
                </div>

                {/* Clear Finished Tasks */}
                <div className="specimen-card hairline-sheen rounded-[6px] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-white block">Clear Finished Transfers</span>
                    <span className="text-[11px] text-zinc-500 font-sans block mt-0.5">
                      Remove completed transfers from the history cache.
                    </span>
                  </div>
                  <motion.div whileTap={{ scale: 0.96 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        clearCompleted();
                        toast.success("Completed transfers cleared from queue");
                      }}
                      className="h-8 px-3 text-xs rounded-[5px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/[0.08] shrink-0"
                    >
                      Clear Completed
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* 3. STORAGE & VAULTS TAB */}
            {activeSection === "storage" && (
              <motion.div
                key="storage"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-4"
              >
                {/* Vault Provisioning */}
                <div className="specimen-card hairline-sheen rounded-[6px] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-white block">Provision New Storage Vault</span>
                    <span className="text-[11px] text-zinc-500 font-sans block mt-0.5">
                      Create an encrypted private Telegram channel for dedicated file hosting.
                    </span>
                  </div>
                  <motion.div whileTap={{ scale: 0.96 }}>
                    <Button
                      size="sm"
                      onClick={() => {
                        onClose();
                        setCreateVaultOpen(true);
                      }}
                      className="h-8 px-3 text-xs rounded-[5px] bg-[#c49b56] hover:bg-[#d8ae69] text-black font-semibold gap-1.5 shrink-0 shadow-sm"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Create Vault</span>
                    </Button>
                  </motion.div>
                </div>

                {/* Storage Analytics */}
                <div className="specimen-card hairline-sheen rounded-[6px] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-white block">Storage Intelligence &amp; Analytics</span>
                    <span className="text-[11px] text-zinc-500 font-sans block mt-0.5">
                      Breakdown by video, image, document, archive, and channel quota.
                    </span>
                  </div>
                  <motion.div whileTap={{ scale: 0.96 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onClose();
                        setAnalyticsOpen(true);
                      }}
                      className="h-8 px-3 text-xs rounded-[5px] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border-white/[0.1] gap-1.5 shrink-0"
                    >
                      <PieChart className="w-3.5 h-3.5" />
                      <span>View Analytics</span>
                    </Button>
                  </motion.div>
                </div>

                {/* Channel Setup Wizard Re-run */}
                <div className="specimen-card hairline-sheen rounded-[6px] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-white block">Reconfigure Vault Channels</span>
                    <span className="text-[11px] text-zinc-500 font-sans block mt-0.5">
                      Rerun the onboarding wizard to add or remove Telegram channels from your drive.
                    </span>
                  </div>
                  <motion.div whileTap={{ scale: 0.96 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onClose();
                        resetWizard();
                      }}
                      className="h-8 px-3 text-xs rounded-[5px] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border-white/[0.1] gap-1.5 shrink-0"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Reconfigure</span>
                    </Button>
                  </motion.div>
                </div>

                {/* Channels Summary Card */}
                <div className="specimen-card hairline-sheen rounded-[6px] p-3.5 space-y-2 font-mono text-[11px]">
                  <div className="text-zinc-500 uppercase tracking-wider text-[10px]">
                    Active Vaultgram Drives ({channels.length})
                  </div>
                  <div className="divide-y divide-white/[0.04]">
                    {channels.map((c) => (
                      <div key={c.id} className="py-1.5 flex items-center justify-between">
                        <span className="text-zinc-200 truncate">{c.title}</span>
                        <span className="text-zinc-500 text-[10px] shrink-0">{c.isSelf ? "Saved Messages" : `ID: ${c.id}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. ACCOUNT & SESSION TAB */}
            {activeSection === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-4"
              >
                {/* Profile Card */}
                <div className="specimen-card hairline-sheen rounded-[6px] p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="specimen-inset flex h-10 w-10 items-center justify-center rounded-[5px] text-sm font-semibold text-white">
                      {user?.firstName ? user.firstName[0].toUpperCase() : "U"}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white font-sans flex items-center gap-1.5">
                        <span>{user?.firstName || "Telegram User"}</span>
                        {user?.lastName && <span className="text-zinc-400">{user.lastName}</span>}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                        {user?.username ? `@${user.username}` : `ID: ${user?.id || "MTProto"}`}
                        {user?.phone && ` · ${user.phone}`}
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-[3px]">
                    Authenticated
                  </span>
                </div>

                {/* Account Switcher */}
                {onOpenAccountSwitcher && (
                  <div className="specimen-card hairline-sheen rounded-[6px] p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-white block">Multi-Account Switcher</span>
                      <span className="text-[11px] text-zinc-500 font-sans block mt-0.5">
                        Switch between multiple logged-in Telegram accounts on this device.
                      </span>
                    </div>
                    <motion.div whileTap={{ scale: 0.96 }}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onClose();
                          onOpenAccountSwitcher();
                        }}
                        className="h-8 px-3 text-xs rounded-[5px] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border-white/[0.1] gap-1.5 shrink-0"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Switch Account</span>
                      </Button>
                    </motion.div>
                  </div>
                )}

                {/* GramJS Session Export */}
                {onOpenExport && (
                  <div className="specimen-card hairline-sheen rounded-[6px] p-4 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-white block">Export Session String (GramJS)</span>
                      <span className="text-[11px] text-zinc-500 font-sans block mt-0.5">
                        Export your encrypted MTProto authorization string for CLI or headless backups.
                      </span>
                    </div>
                    <motion.div whileTap={{ scale: 0.96 }}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onClose();
                          onOpenExport();
                        }}
                        className="h-8 px-3 text-xs rounded-[5px] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border-white/[0.1] gap-1.5 shrink-0"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Export Session</span>
                      </Button>
                    </motion.div>
                  </div>
                )}

                {/* Logout Button */}
                <div className="rounded-[6px] border border-rose-500/20 bg-rose-500/[0.03] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-rose-200 block">Log Out of Telegram</span>
                    <span className="text-[11px] text-rose-400/70 font-sans block mt-0.5">
                      Disconnect this browser session and clear stored session tokens.
                    </span>
                  </div>
                  <motion.div whileTap={{ scale: 0.96 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to log out of Vaultgram?")) {
                          logout();
                        }
                      }}
                      className="h-8 px-3 text-xs rounded-[5px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30 gap-1.5 shrink-0 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* 5. DIAGNOSTICS & CACHE TAB */}
            {activeSection === "diagnostics" && (
              <motion.div
                key="diagnostics"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="space-y-4"
              >
                {/* MTProto Network & DC Diagnostics */}
                <div className="specimen-card hairline-sheen rounded-[6px] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-white block">Network &amp; DC Diagnostics</span>
                    <span className="text-[11px] text-zinc-500 font-sans block mt-0.5">
                      View real-time MTProto WebSocket tunnels, data center latency, and connection health.
                    </span>
                  </div>
                  <motion.div whileTap={{ scale: 0.96 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onClose();
                        setNetworkMonitorOpen(true);
                      }}
                      className="h-8 px-3 text-xs rounded-[5px] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border-white/[0.1] gap-1.5 shrink-0"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Run Ping Diagnostics</span>
                    </Button>
                  </motion.div>
                </div>

                {/* Force Channel Resync */}
                <div className="specimen-card hairline-sheen rounded-[6px] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-white block">Sync Channel Index</span>
                    <span className="text-[11px] text-zinc-500 font-sans block mt-0.5">
                      Check for new messages and files posted across your Telegram storage channels.
                    </span>
                  </div>
                  <motion.div whileTap={{ scale: 0.96 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        toast.info("Syncing channel catalog...");
                        await refreshIndex();
                      }}
                      className="h-8 px-3 text-xs rounded-[5px] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border-white/[0.1] gap-1.5 shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sync Index</span>
                    </Button>
                  </motion.div>
                </div>

                {/* Purge Local IndexedDB Cache */}
                <div className="specimen-card hairline-sheen rounded-[6px] p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-zinc-200 block">Purge Local IndexedDB Cache</span>
                    <span className="text-[11px] text-zinc-500 font-sans block mt-0.5">
                      Clear cached file metadata stored in your browser ({files.length} indexed records).
                    </span>
                  </div>
                  <motion.div whileTap={{ scale: 0.96 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPurgingCache}
                      onClick={handlePurgeCache}
                      className="h-8 px-3 text-xs rounded-[5px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/[0.1] gap-1.5 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{isPurgingCache ? "Purging..." : "Purge Cache"}</span>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-white/[0.08] bg-[#121215]/95 text-[11px] font-mono text-zinc-500 shrink-0">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#c49b56]" />
              <span>Vaultgram v2.0 · Zero Third-Party Proxies</span>
            </div>

            <Button
              size="sm"
              onClick={onClose}
              className="h-8 px-4 text-xs rounded-[6px] bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.12] transition-all"
            >
              Done
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SettingsModal;