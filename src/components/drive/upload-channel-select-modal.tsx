import React, { useState } from "react";
import { ChannelMeta } from "@/lib/telegram/session";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Layers, Bookmark } from "lucide-react";

interface UploadChannelSelectModalProps {
  isOpen: boolean;
  channels: ChannelMeta[];
  filesCount: number;
  onSelect: (channelId: string, channelTitle: string) => void;
  onCancel: () => void;
}

export const UploadChannelSelectModal: React.FC<UploadChannelSelectModalProps> = ({
  isOpen,
  channels,
  filesCount,
  onSelect,
  onCancel,
}) => {
  const [selectedId, setSelectedId] = useState<string>(channels[0]?.id || "");

  const getInitials = (title: string) => {
    if (!title) return "CH";
    const words = title.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return title.slice(0, 2).toUpperCase();
  };

  const handleConfirm = () => {
    const target = channels.find((c) => c.id === selectedId) || channels[0];
    if (target) {
      onSelect(target.id, target.title);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md border-white/[0.1] bg-[#121215] p-5 rounded-[6px] shadow-[0_20px_70px_rgba(0,0,0,0.8)] text-zinc-200">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-[3px] bg-white/[0.05] border border-white/[0.1] text-zinc-200">
              <Layers className="h-3.5 w-3.5" />
            </div>
            <DialogTitle className="text-sm font-semibold text-white font-sans">
              Select Destination Channel
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400 font-sans">
            You are in Unified View. Choose where to upload your {filesCount} file(s).
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-56 overflow-y-auto space-y-1.5 py-2 my-1">
          {channels.map((ch) => {
            const isSelected = (selectedId || channels[0]?.id) === ch.id;
            return (
              <div
                key={ch.id}
                onClick={() => setSelectedId(ch.id)}
                className={`flex cursor-pointer items-center justify-between px-3 py-2 rounded-[4px] border text-xs transition-all select-none ${
                  isSelected
                    ? "bg-white/[0.08] border-white/[0.18] text-white font-medium"
                    : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] bg-white/[0.06] text-[10px] font-mono text-zinc-300">
                    {ch.isSelf ? <Bookmark className="h-3 w-3" /> : getInitials(ch.title)}
                  </div>
                  <span className="truncate">{ch.title}</span>
                </div>

                <div
                  className={`h-3 w-3 rounded-full border ${
                    isSelected ? "bg-white border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "border-zinc-700"
                  }`}
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs rounded-[4px] hover:bg-white/[0.06]">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            className="text-xs rounded-[4px] bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.18] font-medium shadow-[0_0_12px_rgba(255,255,255,0.03)]"
          >
            Start Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
