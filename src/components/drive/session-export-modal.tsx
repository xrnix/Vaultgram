import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getSavedSession,
  getSavedUserProfile,
  getActiveTgConfig,
  TelegramUserProfile,
  TelegramConfig,
} from "@/lib/telegram/session";
import {
  KeyRound,
  Copy,
  Check,
  Download,
  Shield,
  Eye,
  EyeOff,
  User,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

interface SessionExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionExportModal: React.FC<SessionExportModalProps> = ({ isOpen, onClose }) => {
  const [sessionString, setSessionString] = useState<string>("");
  const [userProfile, setUserProfile] = useState<TelegramUserProfile | null>(null);
  const [tgConfig, setTgConfig] = useState<TelegramConfig | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showPlainSession, setShowPlainSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      setIsLoading(true);
      try {
        const [session, user, cfg] = await Promise.all([
          getSavedSession(),
          getSavedUserProfile(),
          getActiveTgConfig(),
        ]);
        setSessionString(session || "");
        setUserProfile(user);
        setTgConfig(cfg);
      } catch (err) {
        console.error("Failed to load session for export:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [isOpen]);

  const handleCopy = async () => {
    if (!sessionString) return;
    try {
      await navigator.clipboard.writeText(sessionString);
      setIsCopied(true);
      toast.success("GramJS StringSession copied to clipboard.");
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      toast.error("Failed to copy session to clipboard.");
    }
  };

  const handleDownload = () => {
    if (!sessionString) return;
    try {
      const backupData = {
        app: "Vaultgram",
        version: "2.0.0",
        exportedAt: new Date().toISOString(),
        user: userProfile,
        apiConfig: tgConfig ? { apiId: tgConfig.apiId, apiHash: tgConfig.apiHash } : null,
        sessionString,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vaultgram-session-${userProfile?.id || "telegram"}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Session backup downloaded as JSON.");
    } catch {
      toast.error("Failed to download session file.");
    }
  };

  const maskedSession = sessionString
    ? `${sessionString.slice(0, 16)}••••••••••••••••••••••••••••••••••••••••${sessionString.slice(-12)}`
    : "No active session loaded";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] border-white/[0.1] bg-[#121215] text-zinc-200 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
        <DialogHeader className="space-y-1.5 pb-2">
          <div className="flex items-center gap-2 text-white font-sans text-base font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-white/[0.04] border border-white/[0.08] text-zinc-200">
              <KeyRound className="h-4 w-4 stroke-[1.5px]" />
            </div>
            <DialogTitle className="text-sm font-sans tracking-tight text-white">
              Export Session &amp; Dev Tools
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400 leading-relaxed font-sans">
            Copy your encrypted GramJS <code className="text-zinc-200 font-mono">StringSession</code> to bypass QR/SMS authentication across test environments and other devices.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 flex flex-col items-center justify-center gap-2 text-zinc-500">
            <div className="h-5 w-5 animate-spin rounded-full border border-white/20 border-t-white" />
            <span className="text-xs font-mono text-zinc-400">Reading session from IndexedDB...</span>
          </div>
        ) : (
          <div className="space-y-3.5 pt-1">
            {/* Account Info Pill */}
            {userProfile && (
              <div className="flex items-center justify-between px-3 py-2 rounded-[4px] border border-white/[0.08] bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] border border-white/[0.15] text-white text-xs font-mono font-medium">
                    {userProfile.firstName ? userProfile.firstName[0].toUpperCase() : <User className="h-3.5 w-3.5" />}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white flex items-center gap-1.5">
                      <span>{userProfile.firstName} {userProfile.lastName || ""}</span>
                      {userProfile.username && (
                        <span className="text-[10px] text-zinc-400 font-mono font-normal">
                          @{userProfile.username}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      Telegram ID: {userProfile.id}
                    </div>
                  </div>
                </div>

                {tgConfig && (
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-zinc-400 block">App ID</span>
                    <span className="text-[11px] font-mono text-zinc-200 font-semibold">
                      #{tgConfig.apiId}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* StringSession Monospace Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-3 w-3 text-zinc-500" />
                  GramJS StringSession
                </span>
                <button
                  type="button"
                  onClick={() => setShowPlainSession(!showPlainSession)}
                  className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition-colors"
                >
                  {showPlainSession ? (
                    <>
                      <EyeOff className="h-3 w-3" />
                      <span>Mask String</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" />
                      <span>Reveal String</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-[4px] border border-white/[0.08] bg-[#09090b] p-2.5 font-mono text-[11px] text-zinc-300 break-all select-all leading-relaxed max-h-28 overflow-y-auto no-scrollbar">
                {showPlainSession ? sessionString : maskedSession}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                type="button"
                onClick={handleCopy}
                disabled={!sessionString}
                className="h-8.5 text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.16] rounded-[4px] transition-all flex items-center justify-center gap-1.5"
              >
                {isCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 stroke-[1.5px]" />
                    <span>Copy Session</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={handleDownload}
                disabled={!sessionString}
                variant="outline"
                className="h-8.5 text-xs font-medium bg-transparent hover:bg-white/[0.05] text-zinc-300 hover:text-white border-white/[0.1] rounded-[4px] transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5 stroke-[1.5px]" />
                <span>Download .JSON</span>
              </Button>
            </div>

            {/* Dev Advice Note */}
            <div className="rounded-[4px] border border-white/[0.08] bg-white/[0.02] p-2.5 text-[10px] text-zinc-400 leading-relaxed flex items-start gap-2">
              <Shield className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-zinc-200">Dev &amp; Testing Tip:</strong> Keep this session string secure. You can paste it directly into the <em>Session</em> tab on any Vaultgram instance to log in without needing phone SMS or QR approval.
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
