import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveTgConfig,
  getTgConfig,
  DEFAULT_TELEGRAM_API_ID,
  DEFAULT_TELEGRAM_API_HASH,
} from "@/lib/telegram/session";
import { KeyRound, ExternalLink, ShieldCheck, AlertTriangle, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";

interface ApiCredentialsCardProps {
  onSaved: () => void;
  onCancel?: () => void;
  canCancel?: boolean;
}

export const ApiCredentialsCard: React.FC<ApiCredentialsCardProps> = ({
  onSaved,
  onCancel,
  canCancel = false,
}) => {
  const [apiId, setApiId] = useState("");
  const [apiHash, setApiHash] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showDemoConfirm, setShowDemoConfirm] = useState(false);

  useEffect(() => {
    async function loadCurrent() {
      const cfg = await getTgConfig();
      if (cfg && cfg.apiId && cfg.apiId !== DEFAULT_TELEGRAM_API_ID) {
        setApiId(String(cfg.apiId));
        setApiHash(cfg.apiHash || "");
      }
    }
    loadCurrent();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = apiId.trim().replace(/\D/g, "");
    const cleanHash = apiHash.trim();

    if (!cleanId || isNaN(Number(cleanId))) {
      toast.error("Please enter a valid numeric Telegram API ID.");
      return;
    }

    if (!cleanHash || cleanHash.length < 10) {
      toast.error("Please enter a valid Telegram API Hash (at least 10 characters).");
      return;
    }

    setIsSaving(true);
    try {
      await saveTgConfig(Number(cleanId), cleanHash);
      toast.success("Telegram API App credentials saved locally.");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to save API configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseDemo = async () => {
    setIsSaving(true);
    try {
      await saveTgConfig(DEFAULT_TELEGRAM_API_ID, DEFAULT_TELEGRAM_API_HASH);
      toast.warning("Using public test credentials. Strict Telegram flood limits may apply.");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to set demo keys.");
    } finally {
      setIsSaving(false);
      setShowDemoConfirm(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 text-left"
    >
      {/* Title & Badge */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white uppercase tracking-wider font-mono">
            <KeyRound className="h-3.5 w-3.5 text-zinc-200 stroke-[1.5px]" />
            <span>Telegram API Setup</span>
          </div>
          {canCancel && onCancel && (
            <button
              onClick={onCancel}
              className="p-1 text-zinc-400 hover:text-white transition-colors rounded-[3px] hover:bg-white/[0.06]"
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
          Vaultgram is 100% serverless. To protect your account from flood limits, bans, and rate caps, connect using your own personal Telegram App keys.
        </p>
      </div>

      {/* Security Guarantee Box */}
      <div className="rounded-[4px] border border-white/[0.08] bg-white/[0.02] p-2.5 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-200 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <span>Local Storage Guarantee</span>
        </div>
        <p className="text-[10px] text-zinc-400 leading-normal font-sans">
          Your keys and MTProto traffic stay strictly inside your browser's IndexedDB. They never pass through any intermediate server.
        </p>
      </div>

      {/* Step by Step Helper */}
      <div className="rounded-[4px] border border-white/[0.06] bg-[#09090b]/80 p-2.5 text-[11px] space-y-2">
        <div className="flex items-center justify-between text-zinc-300 font-medium">
          <span>How to get credentials:</span>
          <a
            href="https://my.telegram.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-zinc-300 hover:text-white font-mono transition-colors underline-offset-4 hover:underline"
          >
            <span>my.telegram.org</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <ol className="text-[10px] text-zinc-400 space-y-1 list-decimal list-inside leading-relaxed font-sans">
          <li>Log in at <strong className="text-zinc-300">my.telegram.org</strong> with your Telegram number</li>
          <li>Click <strong className="text-zinc-300">API development tools</strong></li>
          <li>Create an app (e.g. Title: <em className="text-zinc-300">Vaultgram</em>, Short: <em className="text-zinc-300">vaultgram</em>)</li>
          <li>Copy your numeric <strong className="text-zinc-200">api_id</strong> &amp; <strong className="text-zinc-200">api_hash</strong> below</li>
        </ol>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-3 pt-1">
        <div className="space-y-1">
          <label className="text-[11px] font-mono text-zinc-300 flex items-center justify-between">
            <span>App api_id (Numeric)</span>
            <span className="text-[10px] text-zinc-500">e.g. 24581903</span>
          </label>
          <Input
            type="text"
            placeholder="24581903"
            value={apiId}
            onChange={(e) => setApiId(e.target.value)}
            disabled={isSaving}
            className="h-8.5 bg-white/[0.03] border-white/[0.1] rounded-[4px] text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-white/30"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-mono text-zinc-300 flex items-center justify-between">
            <span>App api_hash</span>
            <span className="text-[10px] text-zinc-500">32 hex characters</span>
          </label>
          <Input
            type="password"
            placeholder="3a4f89d97a92c0199e8d47..."
            value={apiHash}
            onChange={(e) => setApiHash(e.target.value)}
            disabled={isSaving}
            className="h-8.5 bg-white/[0.03] border-white/[0.1] rounded-[4px] text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-white/30"
          />
        </div>

        <div className="pt-1 flex flex-col gap-2">
          <Button
            type="submit"
            disabled={isSaving}
            className="w-full h-8.5 text-xs font-medium bg-white/[0.09] hover:bg-white/[0.16] text-white border border-white/[0.18] rounded-[4px] transition-all flex items-center justify-center gap-1.5"
          >
            <span>{isSaving ? "Saving..." : "Save Credentials & Proceed"}</span>
            <ArrowRight className="h-3.5 w-3.5 stroke-[1.75px]" />
          </Button>

          {/* Demo Fallback Option */}
          {!showDemoConfirm ? (
            <button
              type="button"
              onClick={() => setShowDemoConfirm(true)}
              className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 text-center transition-colors pt-1"
            >
              Or proceed with Telegram Public Test Keys (Rate Limited) →
            </button>
          ) : (
            <div className="rounded-[4px] border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] text-amber-300 space-y-1.5">
              <div className="flex items-center gap-1 font-medium">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span>Notice: Telegram Flood Wait Risk</span>
              </div>
              <p className="text-zinc-400 leading-normal">
                Public test keys are shared globally and frequently encounter <code>FLOOD_WAIT</code> errors. We strongly recommend your personal API keys.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDemoConfirm(false)}
                  className="px-2 py-0.5 text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUseDemo}
                  className="px-2 py-0.5 rounded-[3px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-colors font-mono"
                >
                  Proceed Anyway
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </motion.div>
  );
};
