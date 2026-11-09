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
import { HardDrive, QrCode, Phone, KeyRound, Shield, Settings2 } from "lucide-react";

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
    <div className="flex min-h-screen w-full items-center justify-center p-4 bg-[#07090e] selection:bg-white/10">
      {/* Subtle radial vignette */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)]" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[430px] rounded-[6px] border border-white/[0.1] bg-[#0c0e14]/90 p-4 sm:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden"
      >
        {/* Top Hairline Sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-white/[0.05] border border-white/[0.1] text-zinc-100 shadow-sm">
            <HardDrive className="h-4 w-4 stroke-[1.5px]" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white font-sans">
            Vaultgram
          </h1>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
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
              <div className="flex items-center justify-between px-3 py-1.5 rounded-[4px] border border-white/[0.07] bg-white/[0.02]">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-300">
                  <Shield className="h-3 w-3 text-emerald-400" />
                  <span>
                    App ID:{" "}
                    <strong className="text-zinc-100 font-semibold">
                      #{activeConfig?.apiId || DEFAULT_TELEGRAM_API_ID}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyEditor(true)}
                  className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 hover:text-white transition-colors px-1.5 py-0.5 rounded-[2px] hover:bg-white/[0.06]"
                  title="Configure Telegram API credentials"
                >
                  <Settings2 className="h-3 w-3 text-zinc-500" />
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

        {/* Footer meta badge */}
        <div className="border-t border-white/[0.08] pt-4 mt-5">
          <div className="font-mono text-[11px] text-zinc-500 tracking-wide text-center flex items-center justify-center gap-2">
            <span>Client-Side</span>
            <span className="text-zinc-700">•</span>
            <span>MTProto WSS</span>
            <span className="text-zinc-700">•</span>
            <span>Zero Backend</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
export default AuthPortal;
