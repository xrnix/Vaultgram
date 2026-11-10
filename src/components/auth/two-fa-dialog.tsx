import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Eye, EyeOff, KeyRound } from "lucide-react";

interface TwoFaDialogProps {
  isOpen: boolean;
  hint?: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export const TwoFaDialog: React.FC<TwoFaDialogProps> = ({
  isOpen,
  hint,
  onSubmit,
  onCancel,
}) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your 2FA password.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    onSubmit(password);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[400px] border-white/[0.1] bg-[#121215] text-zinc-200 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl rounded-[6px] relative overflow-hidden">
        {/* Top Hairline Sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        <DialogHeader className="space-y-1.5 text-center sm:text-center pb-1">
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-[4px] bg-white/[0.04] border border-white/[0.08] text-zinc-200 shadow-sm">
            <ShieldCheck className="h-4 w-4 stroke-[1.5px]" />
          </div>
          <DialogTitle className="text-sm font-sans font-semibold tracking-tight text-white">
            Two-Step Verification
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400 font-sans leading-relaxed">
            {hint ? (
              <span>
                Account is protected with a cloud password. Hint:{" "}
                <span className="font-mono text-zinc-200 font-medium bg-white/[0.04] px-1.5 py-0.5 rounded-[3px] border border-white/[0.06]">
                  {hint}
                </span>
              </span>
            ) : (
              "Please enter your Telegram Cloud Password to proceed."
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {error && (
            <div className="rounded-[4px] bg-red-950/40 border border-red-900/60 px-2.5 py-1.5 text-xs text-red-300 font-sans">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <div className="relative">
              <KeyRound className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500 stroke-[1.5px]" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter cloud password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                disabled={isSubmitting}
                className="h-8.5 pl-8 pr-8 bg-white/[0.03] border-white/[0.1] text-xs font-mono text-zinc-100 placeholder:text-zinc-600 rounded-[4px] focus:border-white/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5 stroke-[1.5px]" />
                ) : (
                  <Eye className="h-3.5 w-3.5 stroke-[1.5px]" />
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
              className="h-8 text-xs font-mono text-zinc-400 hover:text-white rounded-[3px] border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04] active:scale-[0.98] transition-all"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 text-xs font-medium bg-white/[0.09] hover:bg-white/[0.16] text-white border border-white/[0.18] rounded-[4px] shadow-[0_0_15px_rgba(255,255,255,0.03)] active:scale-[0.98] transition-all"
            >
              {isSubmitting ? "Verifying..." : "Confirm & Sign In"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
