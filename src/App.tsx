import React, { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useChannelWizardStore } from "@/lib/stores/channel-wizard-store";
import { useDriveStore } from "@/lib/stores/drive-store";
import { useTransferStore } from "@/lib/stores/transfer-store";
import { AuthPortal } from "@/components/auth/auth-portal";
import { ChannelWizard } from "@/components/wizard/channel-wizard";
import { Sidebar } from "@/components/layout/sidebar";
import { DriveCanvas } from "@/components/drive/drive-canvas";
import { TransferDock } from "@/components/drive/transfer-dock";
import { initStreamBridge } from "@/lib/stream/stream-bridge";
import { tgStreamClient } from "@/lib/telegram/client";
import { HardDrive } from "lucide-react";
import { Toaster } from "sonner";

export const App: React.FC = () => {
  const { bootStatus, isConnected, init } = useAuthStore();
  const { isWizardCompleted, loadSavedSelection } = useChannelWizardStore();
  const { initDrive } = useDriveStore();
  const { hydrateStore } = useTransferStore();

  useEffect(() => {
    hydrateStore();
    initStreamBridge(() => tgStreamClient.client);
  }, [hydrateStore]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const isAuthenticated = await init();
        if (isAuthenticated) {
          try {
            const hasSavedChannels = await loadSavedSelection();
            if (hasSavedChannels) {
              initDrive().catch((err) => {
                console.warn("[App] Background drive init warning:", err);
              });
            }
          } catch (wizardErr) {
            console.warn("[App] Saved channels check warning:", wizardErr);
          }
        }
      } catch (authErr) {
        console.error("[App] MTProto Auth verification failure:", authErr);
      }
    }
    bootstrap();
  }, [init, loadSavedSelection, initDrive]);

  useEffect(() => {
    if (isConnected && isWizardCompleted) {
      initDrive().catch((e) => console.warn("[App] Drive init warning:", e));
    }
  }, [isConnected, isWizardCompleted, initDrive]);

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 selection:bg-white/10 selection:text-white relative overflow-hidden font-sans">
      {/* Ethereal Top-Ambient Radial Glow from Research Press */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-12%,rgba(120,140,185,0.08),transparent_70%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(90,110,150,0.03),transparent_60%)]" />

      <Toaster position="bottom-right" richColors theme="dark" />

      {bootStatus === "BOOTING" ? (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#07090e] relative z-10">
          <div className="relative flex flex-col items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-white/[0.05] border border-white/[0.1] text-zinc-100 shadow-sm animate-pulse">
              <HardDrive className="h-5 w-5 stroke-[1.5px]" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-mono tracking-tight text-zinc-400">
                Restoring MTProto session...
              </span>
            </div>
          </div>
        </div>
      ) : !isConnected ? (
        <div className="relative z-10">
          <AuthPortal />
        </div>
      ) : !isWizardCompleted ? (
        <div className="relative z-10">
          <ChannelWizard />
        </div>
      ) : (
        <div className="relative z-10 flex h-screen w-screen overflow-hidden">
          <Sidebar />
          <DriveCanvas />
          {/* Floating Transfer Queue Dock */}
          <TransferDock />
        </div>
      )}
    </div>
  );
};
export default App;
