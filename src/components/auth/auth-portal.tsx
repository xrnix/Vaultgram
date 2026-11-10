import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QrLoginTab } from "./qr-login-tab";
import { PhoneLoginTab } from "./phone-login-tab";
import { SessionImportTab } from "./session-import-tab";
import { ApiCredentialsCard } from "./api-credentials-card";
import {
  hasCustomTgConfig,
  getActiveTgConfig,
  TelegramConfig,
  DEFAULT_TELEGRAM_API_ID,
} from "@/lib/telegram/session";
import { HardDrive, QrCode, Phone, KeyRound, Settings2 } from "lucide-react";

export const AuthPortal: React.FC = () => {
  const [hasConfiguredKeys, setHasConfiguredKeys] = useState<boolean | null>(null);
  const [showKeyEditor, setShowKeyEditor] = useState<boolean>(false);
  const [activeConfig, setActiveConfig] = useState<TelegramConfig | null>(null);

  const checkConfig = async () => {
    const hasCustom = await hasCustomTgConfig();
    const cfg = await getActiveTgConfig();
    setActiveConfig(cfg);
    setHasConfiguredKeys(hasCustom);
  };

  useEffect(() => {
    checkConfig();
  }, []);

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-[#09090b] selection:bg-white/10">
      {/* Subtle radial vignette */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="specimen-card hairline-sheen relative z-10 w-full max-w-[430px] rounded-[6px] p-5 sm:p-7 overflow-hidden"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2.5 pb-4">
          <div className="specimen-inset flex h-10 w-10 items-center justify-center rounded-[5px] text-zinc-100">
            <HardDrive className="h-4.5 w-4.5 stroke-[1.4px]" />
          </div>
          <div>
            <span className="text-[9px] font-mono tracking-[0.25em] uppercase text-zinc-500 font-semibold block pb-0.5 select-none">
              DECENTRALIZED STORAGE // MTPROTO
            </span>
            <h1 className="text-xl font-medium tracking-tight text-white font-sans">
              Vaultgram
            </h1>
          </div>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed font-sans">
            Browser-native personal cloud storage powered directly by Telegram's MTProto API over WebSockets.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {hasConfiguredKeys === null ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-500">
              <div className="h-5 w-5 animate-spin rounded-full border border-white/20 border-t-white" />
              <span className="text-[11px] font-mono text-zinc-400">Checking credentials...</span>
            </div>
          ) : !hasConfiguredKeys || showKeyEditor ? (
            /* Enhancement 1: Compulsory Telegram API Configuration Screen */
            <ApiCredentialsCard
              key="api-config-view"
              canCancel={hasConfiguredKeys}
              onCancel={() => setShowKeyEditor(false)}
              onSaved={async () => {
                await checkConfig();
                setShowKeyEditor(false);
              }}
            />
          ) : (
            /* Login Tabs View with Active API Key Badge */
            <motion.div
              key="login-tabs-view"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Active API Status Deck */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-[4px] border border-white/[0.08] bg-white/[0.02]">
                <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/40 opacity-40"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white/80"></span>
                  </span>
                  <span>
                    App ID:{" "}
                    <strong className="text-white font-medium">
                      #{activeConfig?.apiId || DEFAULT_TELEGRAM_API_ID}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyEditor(true)}
                  className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 hover:text-white transition-all px-2 py-0.5 rounded-[3px] border border-white/[0.08] hover:border-white/[0.18] bg-white/[0.02] hover:bg-white/[0.06] active:scale-[0.98]"
                  title="Configure Telegram API credentials"
                >
                  <Settings2 className="h-3 w-3 text-zinc-400" />
                  <span>Change Keys</span>
                </button>
              </div>

              {/* Tab Switcher */}
              <Tabs defaultValue="qr" className="w-full">
                <TabsList>
                  <TabsTrigger value="qr">
                    <QrCode className="h-3.5 w-3.5 mr-1.5 stroke-[1.5px]" />
                    QR Code
                  </TabsTrigger>
                  <TabsTrigger value="phone">
                    <Phone className="h-3.5 w-3.5 mr-1.5 stroke-[1.5px]" />
                    Phone OTP
                  </TabsTrigger>
                  <TabsTrigger value="session">
                    <KeyRound className="h-3.5 w-3.5 mr-1.5 stroke-[1.5px]" />
                    Session
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="qr">
                  <QrLoginTab />
                </TabsContent>

                <TabsContent value="phone">
                  <PhoneLoginTab />
                </TabsContent>

                <TabsContent value="session">
                  <SessionImportTab />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer meta telemetry */}
        <div className="border-t border-white/[0.08] pt-3.5 mt-5">
          <div className="font-mono text-[10px] text-zinc-500 tracking-wider uppercase text-center flex items-center justify-center gap-2 select-none">
            <span>Zero-Knowledge</span>
            <span className="text-zinc-700">·</span>
            <span>Browser MTProto</span>
            <span className="text-zinc-700">·</span>
            <span>Direct Telegram WSS</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
export default AuthPortal;
