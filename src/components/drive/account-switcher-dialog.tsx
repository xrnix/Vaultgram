import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { SavedAccount } from "@/lib/telegram/session";
import {
  Users,
  UserPlus,
  Trash2,
  KeyRound,
  Shield,
  ArrowRightLeft,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface AccountSwitcherDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExport?: () => void;
  onOpenApiKeySettings?: () => void;
}

export const AccountSwitcherDialog: React.FC<AccountSwitcherDialogProps> = ({
  isOpen,
  onClose,
  onOpenExport,
  onOpenApiKeySettings,
}) => {
  const {
    user,
    savedAccounts,
    loadSavedAccounts,
    switchAccount,
    removeSavedAccount,
    addNewAccount,
  } = useAuthStore();

  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSavedAccounts();
    }
  }, [isOpen, loadSavedAccounts]);

  const handleSwitch = async (account: SavedAccount) => {
    if (account.id === user?.id) return;
    setSwitchingId(account.id);
    try {
      const ok = await switchAccount(account);
      if (ok) {
        toast.success(`Switched to ${account.firstName || "Telegram Account"}`);
        onClose();
      } else {
        toast.error("Failed to connect with selected account session.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to switch account.");
    } finally {
      setSwitchingId(null);
    }
  };

  const handleRemove = async (e: React.MouseEvent, accountId: string) => {
    e.stopPropagation();
    if (confirm("Remove this account from your local saved accounts?")) {
      await removeSavedAccount(accountId);
      toast.info("Account removed from local storage.");
    }
  };

  const handleAddAccount = async () => {
    onClose();
    await addNewAccount();
    toast.info("Please log in with your secondary Telegram account.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px] border-white/[0.1] bg-[#121215] text-zinc-200 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
        <DialogHeader className="space-y-1.5 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-sans text-base font-semibold">
              <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-white/[0.04] border border-white/[0.08] text-zinc-200">
                <Users className="h-4 w-4 stroke-[1.5px]" />
              </div>
              <DialogTitle className="text-sm font-sans tracking-tight text-white">
                Telegram Accounts
              </DialogTitle>
            </div>
            <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-[3px] border border-white/[0.06]">
              {savedAccounts.length} saved
            </span>
          </div>
          <DialogDescription className="text-xs text-zinc-400 leading-relaxed font-sans">
            Switch between your personal profile, storage vaults, and archive channels with 1-click zero-reauth switching.
          </DialogDescription>
        </DialogHeader>

        {/* Saved Accounts Deck */}
        <div className="space-y-2 max-h-[280px] overflow-y-auto no-scrollbar pt-1">
          {savedAccounts.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-500 font-mono">
              No saved accounts found in IndexedDB.
            </div>
          ) : (
            savedAccounts.map((acc) => {
              const isActive = acc.id === user?.id;
              const isSwitching = switchingId === acc.id;

              return (
                <div
                  key={acc.id}
                  onClick={() => !isActive && !isSwitching && handleSwitch(acc)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-[5px] border transition-all ${
                    isActive
                      ? "border-white/[0.22] bg-white/[0.05] shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                      : "border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.12] cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* User Avatar / Monogram */}
                    <div
                      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-mono font-medium ${
                        isActive
                          ? "bg-white/[0.12] text-white border border-white/[0.25]"
                          : "bg-white/[0.04] text-zinc-400 border border-white/[0.08]"
                      }`}
                    >
                      {acc.firstName ? acc.firstName[0].toUpperCase() : "U"}
                      {isActive && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-white ring-2 ring-[#121215]">
                          <Check className="h-1.5 w-1.5 text-black stroke-[3px]" />
                        </span>
                      )}
                    </div>

                    {/* Account Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white truncate">
                          {acc.firstName} {acc.lastName || ""}
                        </span>
                        {isActive && (
                          <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-[#e6cfa3] bg-[#c49b56]/15 px-1.5 py-0.2 rounded-[2px] border border-[#c49b56]/30">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono truncate flex items-center gap-2">
                        {acc.username ? <span>@{acc.username}</span> : <span>ID: {acc.id}</span>}
                        {acc.apiId && (
                          <span className="text-zinc-500">App #{acc.apiId}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Deck */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isActive && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSwitching}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwitch(acc);
                        }}
                        className="h-7 px-2.5 text-[11px] bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.12] rounded-[3px] transition-all flex items-center gap-1"
                      >
                        {isSwitching ? (
                          <div className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
                        ) : (
                          <>
                            <ArrowRightLeft className="h-3 w-3 stroke-[1.5px]" />
                            <span>Switch</span>
                          </>
                        )}
                      </Button>
                    )}

                    <button
                      type="button"
                      title="Remove from saved accounts"
                      onClick={(e) => handleRemove(e, acc.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-zinc-300 transition-opacity rounded-[3px] hover:bg-white/[0.06]"
                    >
                      <Trash2 className="h-3.5 w-3.5 stroke-[1.5px]" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-white/[0.08] flex flex-col gap-2">
          <Button
            type="button"
            onClick={handleAddAccount}
            className="w-full h-8.5 text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.16] rounded-[4px] transition-all flex items-center justify-center gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5 stroke-[1.5px]" />
            <span>Add Another Telegram Account</span>
          </Button>

          <div className="flex items-center justify-between pt-1">
            {onOpenExport && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExport();
                }}
                className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <KeyRound className="h-3 w-3 text-zinc-500" />
                <span>Export Active Session</span>
              </button>
            )}

            {onOpenApiKeySettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenApiKeySettings();
                }}
                className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <Shield className="h-3 w-3 text-zinc-500" />
                <span>API Credentials</span>
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
