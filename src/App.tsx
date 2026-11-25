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
import { VaultgramLogo } from "./components/ui/vaultgram-logo";
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
    <div className="min-h-[100dvh] bg-[#08080a] text-zinc-100 selection:bg-[#e8d5b5]/20 selection:text-white overflow-x-hidden font-sans">

      <Toaster
        position="top-center"
        richColors
        theme="dark"
        toastOptions={{
          className: "!bg-[#121215] !border !border-white/[0.1] !text-zinc-100 !rounded-[4px] !text-xs",
        }}
      />

      {bootStatus === "BOOTING" ? (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#08080a] px-4">
          <div className="flex flex-col items-center gap-5">
            <VaultgramLogo className="h-7 w-7 opacity-80" />
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-[#e8d5b5] animate-pulse" />
              <span className="text-[11px] font-mono tracking-tight text-zinc-500">
                Restoring session
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
        <div className="relative z-10 flex h-[100dvh] w-full overflow-hidden">
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
