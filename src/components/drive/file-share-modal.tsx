import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QRCode from "qrcode";
import {
  X,
  Share2,
  Copy,
  Check,
  Lock,
  Clock,
  ExternalLink,
  QrCode as QrCodeIcon,
  Shield,
  Send,
  Eye,
  EyeOff,
} from "lucide-react";
import { DriveFile } from "@/lib/telegram/indexer";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";

interface FileShareModalProps {
  file: DriveFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FileShareModal: React.FC<FileShareModalProps> = ({ file, isOpen, onClose }) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [expiration, setExpiration] = useState<"1h" | "24h" | "7d" | "never">("24h");
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"link" | "qr">("link");
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen || !file) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  const shareUrl = `${origin}/#share?id=${encodeURIComponent(file.id)}&name=${encodeURIComponent(
    file.name
  )}&size=${file.size}&mime=${encodeURIComponent(file.mimeType)}${
    password ? `&pwd=1` : ""
  }&exp=${expiration}`;

  const cleanChannelId = file.channelId.replace(/^-100/, "").replace(/^-/, "");
  const telegramWebLink = `https://t.me/c/${cleanChannelId}/${file.messageId}`;

  // Render QR Code when activeTab is "qr"
  useEffect(() => {
    if (activeTab === "qr" && qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, shareUrl, {
        width: 180,
        margin: 2,
        color: {
          dark: "#09090b",
          light: "#ffffff",
        },
      });
    }
  }, [activeTab, shareUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    toast.success("Share link copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-none">
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
          className="relative z-10 flex flex-col w-full max-w-xl bg-[#121215] border border-white/[0.1] rounded-[8px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden backdrop-blur-2xl"
        >
          {/* Top Hairline Sheen */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.08] bg-[#121215]/95">
            <div className="flex items-center gap-3 min-w-0 mr-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white/[0.04] border border-white/[0.08] text-[#e6cfa3] shrink-0">
                <Share2 className="h-4 w-4 stroke-[1.5px]" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-medium font-sans text-white truncate">
                  Share File: {file.name}
                </h2>
                <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  {formatBytes(file.size)} · Telegram-Drive Share Protocol
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

          {/* Sub-tabs: Link vs QR Code */}
          <div className="flex items-center border-b border-white/[0.06] bg-[#0d0d10] px-5 sm:px-6 gap-2">
            <button
              onClick={() => setActiveTab("link")}
              className={`py-2.5 px-3.5 text-xs font-mono font-medium border-b-2 transition-colors ${
                activeTab === "link"
                  ? "border-[#c49b56] text-[#e6cfa3]"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Share Link
            </button>
            <button
              onClick={() => setActiveTab("qr")}
              className={`py-2.5 px-3.5 text-xs font-mono font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "qr"
                  ? "border-[#c49b56] text-[#e6cfa3]"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <QrCodeIcon className="w-3.5 h-3.5" />
              <span>Mobile QR</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4.5 text-xs font-sans bg-[#09090b]">
            {activeTab === "link" ? (
              <>
                {/* Shareable Link Box */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono text-zinc-400 block uppercase tracking-wider">
                    Shareable Web Link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 h-9.5 px-3 font-mono text-xs bg-white/[0.03] border border-white/[0.1] rounded-[6px] text-zinc-200 select-all focus:outline-none focus:border-white/20"
                    />
                    <Button
                      size="sm"
                      onClick={handleCopy}
                      className="h-9.5 px-4 text-xs rounded-[6px] bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.14] gap-1.5 shrink-0 transition-all active:scale-[0.98]"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#e6cfa3]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 stroke-[1.5px]" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Password Protection (Optional) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Lock className="w-3 h-3 text-[#c49b56]" />
                      <span>Password Protection (Optional)</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">AES-256 Client-Side</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Add access password (leave blank for open access)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-9.5 px-3 pr-10 font-mono text-xs bg-white/[0.03] border border-white/[0.08] rounded-[6px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expiration Time */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span>Link Expiration</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "1h", label: "1 Hour" },
                      { id: "24h", label: "24 Hours" },
                      { id: "7d", label: "7 Days" },
                      { id: "never", label: "Never" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setExpiration(opt.id as any)}
                        className={`h-8 rounded-[6px] text-xs font-mono border transition-all ${
                          expiration === opt.id
                            ? "bg-[#c49b56]/20 text-[#e6cfa3] border-[#c49b56]/40 font-medium"
                            : "bg-white/[0.02] text-zinc-400 border-white/[0.06] hover:bg-white/[0.05]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* QR Code Stage */
              <div className="flex flex-col items-center justify-center py-5 space-y-4">
                <div className="p-3.5 bg-white border border-white/[0.15] rounded-[8px] shadow-[0_15px_40px_rgba(0,0,0,0.9)]">
                  <canvas ref={qrCanvasRef} className="rounded-[4px] block" />
                </div>
                <div className="text-center space-y-1">
                  <span className="text-xs font-medium text-white block">
                    Scan with Mobile Camera
                  </span>
                  <p className="text-[11px] text-zinc-500 max-w-xs leading-relaxed">
                    Instantly stream or download {file.name} directly on mobile without logging into Telegram.
                  </p>
                </div>
              </div>
            )}

            {/* Direct Telegram Native Link */}
            <div className="rounded-[6px] border border-white/[0.08] bg-white/[0.02] p-3 flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-300">Telegram App Direct Link</span>
              </div>
              <a
                href={telegramWebLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#e6cfa3] hover:text-white flex items-center gap-1.5 underline-offset-4 hover:underline"
              >
                <span>t.me/c/...</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-white/[0.08] bg-[#121215]/95 text-[11px] font-mono text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#c49b56]" />
              <span>Decentralized Zero-Server Share</span>
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
