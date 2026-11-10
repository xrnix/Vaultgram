import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderPlus, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { tgStreamClient } from "@/lib/telegram/client";
import { useDriveStore } from "@/lib/stores/drive-store";
import { saveSelectedChannelsToDb } from "@/lib/telegram/session";
import { toast } from "sonner";

interface CreateVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateVaultModal: React.FC<CreateVaultModalProps> = ({ isOpen, onClose }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const channels = useDriveStore((state) => state.channels);
  const setChannels = useDriveStore((state) => state.setChannels);
  const setActiveChannel = useDriveStore((state) => state.setActiveChannel);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Please enter a vault name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newChannel = await tgStreamClient.createStorageVault(trimmedTitle, description.trim());
      
      // Append to channels list
      const updatedChannels = [newChannel, ...channels];
      setChannels(updatedChannels);
      await saveSelectedChannelsToDb(updatedChannels);

      // Auto-switch to the newly created vault
      await setActiveChannel(newChannel.id);

      toast.success(`Storage Vault "${newChannel.title}" created successfully!`);
      setTitle("");
      setDescription("");
      onClose();
    } catch (err: any) {
      console.error("[CreateVault] Failed:", err);
      toast.error(err.message || "Failed to create storage channel on Telegram.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-lg border-white/[0.1] bg-[#121215] text-zinc-200 p-6 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl rounded-[8px]">
        {/* Top Hairline Sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        <DialogHeader className="space-y-2 pb-3">
          <div className="flex items-center gap-3 text-white font-sans text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white/[0.04] border border-white/[0.08] text-[#e6cfa3]">
              <FolderPlus className="h-4.5 w-4.5 stroke-[1.5px]" />
            </div>
            <DialogTitle className="text-base font-sans tracking-tight text-white">
              Create New Storage Vault
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400 leading-relaxed font-sans">
            Provision a private Telegram channel dedicated for encrypted, unlimited cloud file storage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-4 pt-1">
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider block">
              Vault Name
            </label>
            <Input
              type="text"
              placeholder="e.g. Media Vault, Raw Footage, Datasets"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              className="h-9.5 px-3 text-xs bg-white/[0.03] border-white/[0.1] text-white placeholder:text-zinc-600 rounded-[6px] focus-visible:ring-1 focus-visible:ring-white/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
              Description <span className="text-zinc-600 font-sans lowercase">(optional)</span>
            </label>
            <Input
              type="text"
              placeholder="Vaultgram cloud storage backup"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              className="h-9.5 px-3 text-xs bg-white/[0.03] border-white/[0.08] text-white placeholder:text-zinc-600 rounded-[6px] focus-visible:ring-1 focus-visible:ring-white/20"
            />
          </div>

          <div className="rounded-[6px] border border-white/[0.08] bg-white/[0.02] p-3 text-[11px] text-zinc-400 leading-relaxed flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-[#c49b56] shrink-0 mt-0.5" />
            <span>
              Your new vault is 100% private to your Telegram account. Only you can read, write, or stream from it.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="h-9 px-4 text-xs border-white/[0.08] hover:bg-white/[0.06] text-zinc-300 rounded-[6px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !title.trim()}
              className="h-9 px-4.5 text-xs gap-2 bg-[#c49b56] hover:bg-[#d8ae69] text-black font-semibold rounded-[6px] transition-all shadow-[0_0_20px_rgba(196,155,86,0.2)] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Provisioning Vault...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 stroke-[2px]" />
                  <span>Create Vault</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default CreateVaultModal;
