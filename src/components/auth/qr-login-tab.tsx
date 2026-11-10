import React, { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import { tgStreamClient } from "@/lib/telegram/client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Button } from "@/components/ui/button";
import { RefreshCw, Smartphone } from "lucide-react";
import { TwoFaDialog } from "./two-fa-dialog";
import { toast } from "sonner";

export const QrLoginTab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [is2FaOpen, setIs2FaOpen] = useState(false);
  const [twoFaHint, setTwoFaHint] = useState<string | undefined>();
  const [twoFaResolver, setTwoFaResolver] = useState<((pwd: string) => void) | null>(null);

  const { setUser } = useAuthStore();

  const handleStartQr = useCallback(async () => {
    setIsLoading(true);

    try {
      const result = await tgStreamClient.startQrLogin(
        (url) => {
          if (canvasRef.current) {
            QRCode.toCanvas(canvasRef.current, url, {
              width: 180,
              margin: 1,
              color: {
                dark: "#ffffff",
                light: "#09090b",
              },
            });
            setIsLoading(false);
          }
        },
        async (hint) => {
          setTwoFaHint(hint);
          setIs2FaOpen(true);
          return new Promise<string>((resolve) => {
            setTwoFaResolver(() => resolve);
          });
        }
      );

      toast.success(`Connected as ${result.user.firstName || "Telegram User"}`);
      setUser(result.user);
    } catch (err: any) {
      console.error("QR Login failed:", err);
      setIsLoading(false);
      toast.error(err.message || "Failed to establish Telegram connection.");
    }
  }, [setUser]);

  useEffect(() => {
    handleStartQr();
  }, [handleStartQr]);

  const handleTwoFaSubmit = (pass: string) => {
    setIs2FaOpen(false);
    if (twoFaResolver) {
      twoFaResolver(pass);
      setTwoFaResolver(null);
    }
  };

  const handleTwoFaCancel = () => {
    setIs2FaOpen(false);
    if (twoFaResolver) {
      twoFaResolver("");
      setTwoFaResolver(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 py-1">
      {/* Precision Viewport Stage */}
      <div className="relative flex h-[208px] w-[208px] items-center justify-center rounded-[6px] border border-white/[0.1] bg-[#09090b] p-3 shadow-[inset_0_1px_4px_rgba(0,0,0,0.8),0_4px_24px_rgba(0,0,0,0.6)]">
        {/* Architectural Reticle Corner Brackets */}
        <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t border-l border-white/40 pointer-events-none" />
        <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t border-r border-white/40 pointer-events-none" />
        <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b border-l border-white/40 pointer-events-none" />
        <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b border-r border-white/40 pointer-events-none" />

        <canvas
          ref={canvasRef}
          className={`rounded-[3px] transition-opacity duration-200 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
        />
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-500">
            <div className="h-5 w-5 animate-spin rounded-full border border-white/20 border-t-white" />
            <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-400">
              Connecting MTProto...
            </span>
          </div>
        )}
      </div>

      {/* Archival Step Telemetry */}
      <div className="w-full rounded-[4px] border border-white/[0.07] bg-white/[0.02] p-2.5 space-y-2 text-left">
        <div className="flex items-center gap-1.5 text-xs font-medium text-white pb-0.5">
          <Smartphone className="h-3.5 w-3.5 text-zinc-300 stroke-[1.5px]" />
          <span>Scan with Telegram Mobile</span>
        </div>
        <div className="space-y-1.5 font-sans text-[11px] text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-zinc-300 bg-white/[0.05] border border-white/[0.08] px-1 rounded-[2px]">01</span>
            <span>Open <strong className="text-zinc-200 font-medium">Telegram</strong> on your phone</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-zinc-300 bg-white/[0.05] border border-white/[0.08] px-1 rounded-[2px]">02</span>
            <span>Go to <strong className="text-zinc-200 font-medium">Settings → Devices</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-zinc-300 bg-white/[0.05] border border-white/[0.08] px-1 rounded-[2px]">03</span>
            <span>Tap <strong className="text-zinc-200 font-medium">Link Desktop Device</strong></span>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleStartQr}
        className="h-7 gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-white rounded-[3px] border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04] active:scale-[0.98] transition-all"
      >
        <RefreshCw className="h-3 w-3 stroke-[1.5px]" />
        Regenerate QR
      </Button>

      <TwoFaDialog
        isOpen={is2FaOpen}
        hint={twoFaHint}
        onSubmit={handleTwoFaSubmit}
        onCancel={handleTwoFaCancel}
      />
    </div>
  );
};
