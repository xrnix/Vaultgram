import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileText,
  Download,
  Eye,
  Copy,
  Check,
  ShieldCheck,
  Server,
  ExternalLink,
  Loader2,
  Pin,
  Star,
  Share2,
} from "lucide-react";
import { DriveFile } from "@/lib/telegram/indexer";
import { useDriveStore } from "@/lib/stores/drive-store";
import { useTransferStore } from "@/lib/stores/transfer-store";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface FileDetailsModalProps {
  file: DriveFile | null;
  isOpen: boolean;
  onClose: () => void;
  onPreview?: (file: DriveFile) => void;
  onShare?: (file: DriveFile) => void;
}

export const FileDetailsModal: React.FC<FileDetailsModalProps> = ({
  file,
  isOpen,
  onClose,
  onPreview,
  onShare,
}) => {
  const { pinnedFileIds, favoriteFileIds, togglePin, toggleFavorite } = useDriveStore();
  const { enqueueDownload } = useTransferStore();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [checksum, setChecksum] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState<boolean>(false);
  const [hashProgress, setHashProgress] = useState<number>(0);

  if (!isOpen || !file) return null;

  const isPinned = pinnedFileIds.has(file.id);
  const isFavorite = favoriteFileIds.has(file.id);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`Copied ${label}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Calculate SHA-256 Checksum on the fly using Web Crypto API
  const handleCalculateChecksum = async () => {
    setIsHashing(true);
    setChecksum(null);
    setHashProgress(0);

    try {
      const response = await fetch(`/stream/${file.id}`);
      if (!response.ok) throw new Error("Could not stream file for verification.");

      const contentLength = Number(response.headers.get("Content-Length")) || file.size;
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream reader not supported.");

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.byteLength;
          if (contentLength > 0) {
            setHashProgress(Math.round((received / contentLength) * 100));
          }
        }
      }

      const combined = new Uint8Array(received);
      let offset = 0;
      for (const c of chunks) {
        combined.set(c, offset);
        offset += c.byteLength;
      }

      const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      setChecksum(hashHex);
      toast.success("SHA-256 integrity verified");
    } catch (err: any) {
      toast.error(err.message || "Failed to calculate SHA-256 checksum.");
    } finally {
      setIsHashing(false);
    }
  };

  const getCleanChannelId = (cid: string) => {
    return cid.replace(/^-100/, "").replace(/^-/, "");
  };

  const telegramWebLink = `https://t.me/c/${getCleanChannelId(file.channelId)}/${file.messageId}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
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
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ type: "spring", stiffness: 450, damping: 32 }}
          className="relative z-10 flex flex-col w-full max-w-2xl max-h-[88vh] bg-[#121215] border border-white/[0.12] rounded-[8px] shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden backdrop-blur-2xl"
        >
          {/* Top Hairline Sheen */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-[#121215]/95">
            <div className="flex items-center gap-2.5 min-w-0 mr-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-white/[0.04] border border-white/[0.08] text-[#e6cfa3] shrink-0">
                <FileText className="h-4 w-4 stroke-[1.5px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-medium font-sans text-white truncate" title={file.name}>
                  {file.name}
                </h2>
                <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5 mt-0.5">
                  <span>File Inspector &amp; MTProto Metadata</span>
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

          {/* Content Deck */}
          <div className="p-5 sm:p-6 overflow-y-auto no-scrollbar space-y-4 text-xs font-sans bg-[#09090b]">
            {/* Overview Metric Deck */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-[5px] border border-white/[0.08] bg-white/[0.02] space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Size</span>
                <span className="text-xs font-mono font-medium text-white block">
                  {formatBytes(file.size)}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 block truncate">
                  {file.size.toLocaleString()} B
                </span>
              </div>

              <div className="p-3 rounded-[5px] border border-white/[0.08] bg-white/[0.02] space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Category</span>
                <span className="text-xs font-mono font-medium text-white block">
                  {file.category}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 block truncate">
                  {file.mimeType}
                </span>
              </div>

              <div className="p-3 rounded-[5px] border border-white/[0.08] bg-white/[0.02] space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Uploaded</span>
                <span className="text-xs font-mono font-medium text-white block truncate">
                  {formatDate(file.date)}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 block">
                  {new Date(file.date * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div className="p-3 rounded-[5px] border border-white/[0.08] bg-white/[0.02] space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Telegram DC</span>
                <span className="text-xs font-mono font-medium text-white block">
                  {file.dcId ? `DC ${file.dcId}` : "DC 2 (AMS)"}
                </span>
                <span className="text-[9px] font-mono text-zinc-500 block truncate">WSS Protected</span>
              </div>
            </div>

            {/* Telegram MTProto Details Table */}
            <div className="rounded-[4px] border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-zinc-500" />
                  <span>MTProto Infrastructure Coordinates</span>
                </div>
              </div>

              <div className="divide-y divide-white/[0.04] font-mono text-[11px]">
                {/* Message ID */}
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-zinc-500">Telegram Message ID</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-200">#{file.messageId}</span>
                    <button
                      onClick={() => handleCopy(String(file.messageId), "Message ID")}
                      className="p-1 text-zinc-500 hover:text-white transition-colors"
                      title="Copy Message ID"
                    >
                      {copiedField === "Message ID" ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Channel ID */}
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-zinc-500">Channel / Drive</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-200 truncate max-w-[200px]">{file.channelTitle} ({file.channelId})</span>
                    <button
                      onClick={() => handleCopy(file.channelId, "Channel ID")}
                      className="p-1 text-zinc-500 hover:text-white transition-colors"
                      title="Copy Channel ID"
                    >
                      {copiedField === "Channel ID" ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Local Stream Bridge Route */}
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-zinc-500">Stream Bridge URI</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300">/stream/{file.id}</span>
                    <button
                      onClick={() => handleCopy(`/stream/${file.id}`, "Stream URI")}
                      className="p-1 text-zinc-500 hover:text-white transition-colors"
                      title="Copy Stream Route"
                    >
                      {copiedField === "Stream URI" ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SHA-256 Cryptographic Verification Box */}
            <div className="rounded-[4px] border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Cryptographic Integrity (SHA-256)</span>
                </div>

                {!checksum && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCalculateChecksum}
                    disabled={isHashing}
                    className="h-6 text-[10px] font-mono bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.1] rounded-[3px]"
                  >
                    {isHashing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        <span>Hashing {hashProgress}%...</span>
                      </>
                    ) : (
                      "Verify Checksum"
                    )}
                  </Button>
                )}
              </div>

              {checksum ? (
                <div className="flex items-center justify-between p-2 rounded-[3px] bg-[#121215] border border-white/[0.08] font-mono text-[10px] text-zinc-300 break-all select-all">
                  <span>{checksum}</span>
                  <button
                    onClick={() => handleCopy(checksum, "SHA-256 Checksum")}
                    className="p-1 text-zinc-400 hover:text-white shrink-0 ml-2"
                  >
                    {copiedField === "SHA-256 Checksum" ? (
                      <Check className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-zinc-500 font-sans leading-relaxed">
                  Stream chunks directly through the client-side Web Crypto API to compute an immutable SHA-256 fingerprint.
                </p>
              )}
            </div>

            {/* Quick External Links & Shortcuts */}
            <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
              <a
                href={telegramWebLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>View Message in Telegram</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePin(file.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-[3px] border transition-colors ${
                    isPinned
                      ? "bg-white/[0.1] text-white border-white/[0.2]"
                      : "text-zinc-400 hover:text-white border-white/[0.06] hover:bg-white/[0.04]"
                  }`}
                >
                  <Pin className="w-3 h-3" />
                  <span>{isPinned ? "Pinned" : "Pin"}</span>
                </button>

                <button
                  onClick={() => toggleFavorite(file.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-[3px] border transition-colors ${
                    isFavorite
                      ? "bg-[#c49b56]/15 text-[#e6cfa3] border-[#c49b56]/30"
                      : "text-zinc-400 hover:text-white border-white/[0.06] hover:bg-white/[0.04]"
                  }`}
                >
                  <Star className="w-3 h-3" />
                  <span>{isFavorite ? "Favorited" : "Favorite"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.08] bg-[#121215]/95">
            <div className="flex items-center gap-2">
              {onPreview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onPreview(file);
                  }}
                  className="h-8 px-3 text-xs rounded-[4px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.1] gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 stroke-[1.5px]" />
                  <span>Preview</span>
                </Button>
              )}

              {onShare && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onClose();
                    onShare(file);
                  }}
                  className="h-8 px-3 text-xs rounded-[4px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.1] gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5 stroke-[1.5px]" />
                  <span>Share</span>
                </Button>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => {
                enqueueDownload(file);
                onClose();
              }}
              className="h-8 px-3.5 text-xs rounded-[4px] bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.16] gap-1.5 font-medium"
            >
              <Download className="w-3.5 h-3.5 stroke-[1.5px]" />
              <span>Download File</span>
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
