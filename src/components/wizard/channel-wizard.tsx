import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useChannelWizardStore } from "@/lib/stores/channel-wizard-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Layers,
  Search,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  FolderSync,
  Check,
} from "lucide-react";

export const ChannelWizard: React.FC = () => {
  const {
    availableChannels,
    selectedChannelIds,
    isLoading,
    error,
    floodWaitSeconds,
    fetchChannels,
    toggleChannel,
    selectAll,
    deselectAll,
    confirmSelection,
  } = useChannelWizardStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Instant real-time filtering
  const filteredChannels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return availableChannels;
    return availableChannels.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.username && c.username.toLowerCase().includes(q))
    );
  }, [availableChannels, searchQuery]);

  const selectedCount = selectedChannelIds.size;
  const isContinueDisabled = selectedCount === 0 || isLoading || isSaving;

  const handleContinue = async () => {
    setIsSaving(true);
    try {
      await confirmSelection();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-[#09090b] selection:bg-white/10">
      {/* Background vignette */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[480px] rounded-[6px] border border-white/[0.1] bg-[#121215]/95 p-4 sm:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.9)] backdrop-blur-2xl overflow-hidden"
      >
        {/* Top Hairline Sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col space-y-1.5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-white/[0.05] border border-white/[0.1] text-zinc-100 shadow-sm">
              <Layers className="h-3.5 w-3.5 stroke-[1.5px]" />
            </div>
            <h1 className="text-base font-semibold tracking-tight text-white font-sans">
              Select Channels to Index
            </h1>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Choose the Telegram chats and channels Vaultgram should monitor for media and files.
          </p>
        </div>

        {/* Rate Limit Alert */}
        {floodWaitSeconds > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300 font-mono">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Telegram rate-limit active. Retrying in {floodWaitSeconds}s...</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-3 flex items-center justify-between rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchChannels()}
              className="text-xs underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Search Bar & Counter */}
        <div className="space-y-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500 stroke-[1.5px]" />
            <Input
              type="text"
              placeholder="Search chats and channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading}
              className="h-8.5 pl-8 text-xs bg-white/[0.03] border-white/[0.1] rounded-[4px] text-zinc-100 placeholder:text-zinc-600 focus:border-white/30"
            />
          </div>

          {/* Quick Actions & Counter */}
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-0.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                disabled={isLoading || availableChannels.length === 0}
                className="hover:text-white transition-colors disabled:opacity-40"
              >
                Select All
              </button>
              <span className="text-zinc-700">•</span>
              <button
                type="button"
                onClick={deselectAll}
                disabled={isLoading || availableChannels.length === 0}
                className="hover:text-white transition-colors disabled:opacity-40"
              >
                Deselect All
              </button>
            </div>

            <span className="text-zinc-400 font-medium">
              <span className="text-white font-semibold">{selectedCount}</span> of{" "}
              {availableChannels.length} selected
            </span>
          </div>
        </div>

        {/* Scrollable Channel List Container */}
        <div className="w-full max-h-[340px] overflow-y-auto no-scrollbar p-1 space-y-1.5 border border-white/[0.08] bg-[#09090b]/80 rounded-[4px]">
          {isLoading ? (
            /* Sleek Skeleton Loading Rows */
            <div className="space-y-1.5 p-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex h-12 w-full items-center justify-between px-3 py-2 rounded-[4px] bg-white/[0.02] border border-white/[0.05] animate-pulse"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                    <div className="h-7 w-7 rounded-[4px] bg-white/[0.06] shrink-0" />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="h-3 w-28 rounded-[2px] bg-white/[0.06]" />
                      <div className="h-2 w-16 rounded-[2px] bg-white/[0.04]" />
                    </div>
                  </div>
                  <div className="h-4 w-4 rounded-[3px] bg-white/[0.06] shrink-0" />
                </div>
              ))}
            </div>
          ) : filteredChannels.length === 0 ? (
            /* Empty State */
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center p-4 text-zinc-500">
              <FolderSync className="h-6 w-6 stroke-[1.25px] text-zinc-600" />
              <span className="text-xs font-medium text-zinc-400">
                {searchQuery ? "No channels match your filter" : "No Telegram channels found"}
              </span>
              <p className="text-[11px] text-zinc-600 max-w-[220px]">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Create or join a channel in Telegram to index files."}
              </p>
            </div>
          ) : (
            filteredChannels.map((channel, idx) => {
              const isSelected = selectedChannelIds.has(channel.id);
              const initials =
                channel.title.trim().split(/\s+/).length >= 2
                  ? (channel.title.trim().split(/\s+/)[0][0] + channel.title.trim().split(/\s+/)[1][0]).toUpperCase()
                  : channel.title.slice(0, 2).toUpperCase();

              return (
                <motion.div
                  key={channel.id}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => toggleChannel(channel.id)}
                  className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-[4px] border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-white/[0.07] border-white/[0.22] text-white shadow-[0_0_15px_rgba(255,255,255,0.03)]"
                      : "bg-white/[0.015] border-white/[0.06] text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 hover:border-white/[0.12]"
                  }`}
                >
                  {/* Left Section: Index Number + Avatar + Channel Info */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                    <span className="font-mono text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0">
                      {String(idx + 1).padStart(2, "0")} ·
                    </span>

                    {/* Avatar / Initials */}
                    <div className="flex items-center justify-center w-7 h-7 rounded-[3px] bg-white/[0.05] border border-white/[0.1] text-[11px] font-mono font-medium text-zinc-300 shrink-0 select-none">
                      {initials}
                    </div>

                    {/* Text Container */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-medium text-zinc-100 truncate leading-snug" title={channel.title}>
                        {channel.title}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 truncate mt-0.5 leading-none">
                        {channel.username ? `@${channel.username}` : channel.isSelf ? "Saved Messages" : "Telegram Chat"}
                        {channel.unreadCount ? ` • ${channel.unreadCount} unread` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Right Section: Tactile Checkbox */}
                  <div className="flex items-center justify-center shrink-0">
                    <div
                      className={`w-4 h-4 rounded-[3px] flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-white/[0.18] border border-white/50 text-white shadow-[0_0_8px_rgba(255,255,255,0.18)]"
                          : "border border-white/[0.12] bg-white/[0.02] group-hover:border-white/25"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between">
          <button
            type="button"
            onClick={() => fetchChannels()}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh list</span>
          </button>

          <Button
            onClick={handleContinue}
            disabled={isContinueDisabled}
            className="gap-2 rounded-[4px] h-8.5 px-4 font-medium text-xs bg-white/[0.09] hover:bg-white/[0.16] text-white border border-white/[0.18] hover:border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.03)] active:scale-[0.98] transition-all disabled:opacity-40"
          >
            <span>{isSaving ? "Saving..." : "Continue to Drive"}</span>
            <ArrowRight className="h-3.5 w-3.5 stroke-[1.75px]" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
