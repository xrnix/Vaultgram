import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bookmark, Check, Copy, FastForward, Loader2 } from "lucide-react";
import { DriveFile } from "@/lib/telegram/indexer";
import { tgStreamClient } from "@/lib/telegram/client";
import { useDriveStore } from "@/lib/stores/drive-store";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";

interface CopyToVaultModalProps {
  files: DriveFile[] | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CopyToVaultModal: React.FC<CopyToVaultModalProps> = ({
  files,
  isOpen,
  onClose,
}) => {
  const channels = useDriveStore((state) => state.channels);
  const activeChannelId = useDriveStore((state) => state.activeChannelId);
  const refreshIndex = useDriveStore((state) => state.refreshIndex);

  const availableDestinations = channels.filter(
    (c) => activeChannelId === "UNIFIED" || c.id !== activeChannelId
  );

  const [selectedDestId, setSelectedDestId] = useState<string>(
    availableDestinations[0]?.id || channels[0]?.id || ""
  );
  const [isCopying, setIsCopying] = useState(false);

  if (!files || files.length === 0) return null;

  const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const targetChannel = channels.find((c) => c.id === selectedDestId) || availableDestinations[0];

  const getInitials = (title: string) => {
    if (!title) return "CH";
    const words = title.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return title.slice(0, 2).toUpperCase();
  };

  const handleExecuteCopy = async () => {
    if (!targetChannel) {
      toast.error("Please select a destination vault.");
      return;
    }

    setIsCopying(true);
    try {
      // Group files by source channel
      const grouped = new Map<string, number[]>();
      for (const f of files) {
        const list = grouped.get(f.channelId) || [];
        list.push(f.messageId);
        grouped.set(f.channelId, list);
      }

      for (const [sourceChannelId, messageIds] of grouped.entries()) {
        await tgStreamClient.forwardFiles(sourceChannelId, targetChannel.id, messageIds);
      }

      toast.success(
        `Instantly cloned ${files.length} file(s) (${formatBytes(totalBytes)}) to "${targetChannel.title}" with zero bandwidth!`
      );
      onClose();
      // Background re-index to capture new messages in destination
      setTimeout(() => refreshIndex(), 1000);
    } catch (err: any) {
      console.error("[CopyToVault] Failed:", err);
      toast.error(err.message || "Failed to clone files to destination vault.");
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isCopying && onClose()}>
      <DialogContent className="sm:max-w-lg border-white/[0.1] bg-[#121215] text-zinc-200 p-6 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl rounded-[8px]">
        {/* Top Hairline Sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        <DialogHeader className="space-y-2 pb-3">
          <div className="flex items-center gap-3 text-white font-sans text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white/[0.04] border border-white/[0.08] text-[#e6cfa3]">
              <FastForward className="h-4.5 w-4.5 stroke-[1.5px]" />
            </div>
            <DialogTitle className="text-base font-sans tracking-tight text-white">
              Instant Cloud Clone
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400 leading-relaxed font-sans">
            Forward {files.length} item(s) directly on Telegram servers. Zero upload or download bandwidth consumed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Files Summary Pill */}
          <div className="rounded-[6px] border border-white/[0.08] bg-white/[0.02] p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 min-w-0 mr-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#e6cfa3] bg-[#c49b56]/15 px-2 py-0.5 rounded-[3px] border border-[#c49b56]/30 shrink-0">
                {files.length === 1 ? files[0].category : "BATCH"}
              </span>
              <span className="text-white font-medium truncate">
                {files.length === 1 ? files[0].name : `${files.length} selected files`}
              </span>
            </div>
            <span className="font-mono text-zinc-400 tabular-nums shrink-0">
              {formatBytes(totalBytes)}
            </span>
          </div>

          {/* Destination Vault Picker */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 px-0.5">
              Select Destination Storage Vault
            </div>

            <div className="max-h-[240px] overflow-y-auto no-scrollbar space-y-1.5 rounded-[6px] border border-white/[0.07] bg-[#09090b] p-1.5">
              {channels.map((ch) => {
                const isSelected = (selectedDestId || channels[0]?.id) === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => !isCopying && setSelectedDestId(ch.id)}
                    className={`flex cursor-pointer items-center justify-between p-2.5 rounded-[5px] border text-xs transition-all select-none ${
                      isSelected
                        ? "bg-white/[0.08] border-white/[0.18] text-white"
                        : "border-transparent bg-transparent text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-[11px] font-mono font-medium ${
                          isSelected
                            ? "bg-[#c49b56]/20 text-[#e6cfa3] border border-[#c49b56]/30"
                            : "bg-white/[0.04] text-zinc-400 border border-white/[0.06]"
                        }`}
                      >
                        {ch.isSelf ? <Bookmark className="h-3.5 w-3.5" /> : getInitials(ch.title)}
                      </div>
                      <div className="min-w-0">
                        <span className="truncate block font-medium">{ch.title}</span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {ch.isSelf ? "Saved Messages" : `Channel ID: ${ch.id}`}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-white text-black">
                        <Check className="h-3 w-3 stroke-[3px]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCopying}
              onClick={onClose}
              className="h-9 px-4 text-xs border-white/[0.08] hover:bg-white/[0.06] text-zinc-300 rounded-[6px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isCopying || !targetChannel}
              onClick={handleExecuteCopy}
              className="h-9 px-4.5 text-xs gap-2 bg-[#c49b56] hover:bg-[#d8ae69] text-black font-semibold rounded-[6px] transition-all shadow-[0_0_20px_rgba(196,155,86,0.2)] disabled:opacity-50"
            >
              {isCopying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Cloning via MTProto...</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 stroke-[2px]" />
                  <span>Clone to Vault</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CopyToVaultModal;
