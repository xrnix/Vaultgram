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
import { QrCode, Phone, KeyRound, Settings2 } from "lucide-react";
import { VaultgramLogo } from "../ui/vaultgram-logo";

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
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center bg-[#08080a] px-3.5 py-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] selection:bg-[#e8d5b5]/20 sm:p-4">
      {/* A single overhead light. No vignette, no dot field. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[440px] bg-[radial-gradient(ellipse_55%_100%_at_50%_0%,rgba(232,213,181,0.05),transparent_72%)]" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-[8px] border border-white/[0.07] bg-[linear-gradient(180deg,#111114_0%,#0c0c0f_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_40px_90px_-40px_rgba(0,0,0,1)] sm:p-7"
      >
        {/* Brand */}
        <div className="flex flex-col items-center pb-5 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/[0.07] bg-[#0a0a0c] shadow-[inset_0_1px_2px_rgba(0,0,0,0.7)]">
            <VaultgramLogo className="h-5 w-5 opacity-90" />
          </div>
          <h1 className="mt-3.5 text-[17px] font-semibold tracking-[-0.02em] text-zinc-100">
            Vaultgram
          </h1>
          <p className="mt-1 max-w-[290px] text-[11.5px] leading-relaxed text-zinc-500">
            Your Telegram account, as a private drive. Everything runs in this browser.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {hasConfiguredKeys === null ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-8">
              <div className="h-4 w-4 animate-spin rounded-full border border-white/[0.12] border-t-zinc-400" />
              <span className="text-[10.5px] text-zinc-600">Checking credentials</span>
            </div>
          ) : !hasConfiguredKeys || showKeyEditor ? (
            /* Compulsory Telegram API Configuration Screen */
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
            /* Login Tabs */
            <motion.div
              key="login-tabs-view"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-3.5"
            >
              {/* Active API — a line of text, not a status deck */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[10.5px] text-zinc-600">
                  <span className="h-1 w-1 rounded-full bg-emerald-400/80" />
                  <span>API</span>
                  <span className="num font-mono text-zinc-500">
                    #{activeConfig?.apiId || DEFAULT_TELEGRAM_API_ID}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowKeyEditor(true)}
                  className="flex items-center gap-1 rounded-[3px] px-1.5 py-1 text-[10.5px] text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-200"
                  title="Configure Telegram API credentials"
                >
                  <Settings2 className="h-3 w-3" />
                  <span>Change keys</span>
                </button>
              </div>

              <Tabs defaultValue="qr" className="w-full">
                <TabsList className="h-9">
                  <TabsTrigger value="qr" className="h-7 text-[11.5px]">
                    <QrCode className="mr-1.5 h-3.5 w-3.5 shrink-0 stroke-[1.5px]" />
                    <span>QR code</span>
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="h-7 text-[11.5px]">
                    <Phone className="mr-1.5 h-3.5 w-3.5 shrink-0 stroke-[1.5px]" />
                    <span>Phone</span>
                  </TabsTrigger>
                  <TabsTrigger value="session" className="h-7 text-[11.5px]">
                    <KeyRound className="mr-1.5 h-3.5 w-3.5 shrink-0 stroke-[1.5px]" />
                    <span>Session</span>
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

        {/* Footer — one honest line */}
        <div className="mt-5 border-t border-white/[0.05] pt-3.5 text-center text-[10px] text-zinc-700">
          Direct to Telegram · no intermediary server · AGPLv3
        </div>
      </motion.div>
    </div>
  );
};
export default AuthPortal;
