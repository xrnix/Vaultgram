import { create } from "zustand";
import {
  getSavedSession,
  getSavedUserProfile,
  clearSavedSession,
  getSavedAccounts,
  removeAccount,
  switchToAccount,
  TelegramUserProfile,
  SavedAccount,
} from "../telegram/session";
import { tgStreamClient } from "../telegram/client";
import { useChannelWizardStore } from "./channel-wizard-store";
import { useDriveStore } from "./drive-store";

export type AuthBootStatus = "BOOTING" | "AUTHENTICATED" | "UNAUTHENTICATED";
export type AuthStage = "idle" | "qr" | "phone" | "otp" | "2fa" | "session" | "authorized";

interface AuthState {
  bootStatus: AuthBootStatus;
  isConnected: boolean;
  isConnecting: boolean;
  user: TelegramUserProfile | null;
  savedAccounts: SavedAccount[];
  authStage: AuthStage;
  phoneStep: "phone" | "otp" | "2fa";
  phoneNumber: string;
  phoneCodeHash: string | null;

  // Actions
  init: () => Promise<boolean>;
  loadSavedAccounts: () => Promise<SavedAccount[]>;
  switchAccount: (account: SavedAccount) => Promise<boolean>;
  removeSavedAccount: (accountId: string) => Promise<void>;
  addNewAccount: () => Promise<void>;
  setAuthStage: (stage: AuthStage) => void;
  setPhoneStep: (step: "phone" | "otp" | "2fa") => void;
  setUser: (user: TelegramUserProfile | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  bootStatus: "BOOTING",
  isConnected: false,
  isConnecting: false,
  user: null,
  savedAccounts: [],
  authStage: "idle",
  phoneStep: "phone",
  phoneNumber: "",
  phoneCodeHash: null,

  loadSavedAccounts: async () => {
    try {
      const accounts = await getSavedAccounts();
      set({ savedAccounts: accounts });
      return accounts;
    } catch (e) {
      console.error("[useAuthStore] Failed to load saved accounts:", e);
      return [];
    }
  },

  switchAccount: async (account: SavedAccount) => {
    set({ isConnecting: true });
    try {
      // 1. Tear down current active client connection
      await tgStreamClient.destroy();

      // 2. Set newly selected account as active session
      await switchToAccount(account.id);

      // 3. Clear file cache & selected channel state for clean account transition
      useDriveStore.getState().resetDrive();
      useChannelWizardStore.getState().resetWizard();

      // 4. Reconnect to MTProto with switched account
      const ok = await tgStreamClient.init();
      if (ok && tgStreamClient.user) {
        set({
          isConnected: true,
          isConnecting: false,
          user: tgStreamClient.user,
          authStage: "authorized",
          bootStatus: "AUTHENTICATED",
        });

        // 5. Hydrate channels & drive for the new account
        const hasSelection = await useChannelWizardStore.getState().loadSavedSelection();
        if (hasSelection) {
          await useDriveStore.getState().initDrive();
        }

        await get().loadSavedAccounts();
        return true;
      }
    } catch (err) {
      console.error("[useAuthStore] Failed to switch account:", err);
    }

    set({ isConnecting: false });
    return false;
  },

  removeSavedAccount: async (accountId: string) => {
    await removeAccount(accountId);
    await get().loadSavedAccounts();
    const currentUser = get().user;
    if (currentUser && currentUser.id === accountId) {
      // If we removed the currently active account, log out
      await get().logout();
    }
  },

  addNewAccount: async () => {
    await tgStreamClient.destroy();
    await clearSavedSession();
    useDriveStore.getState().resetDrive();
    useChannelWizardStore.getState().resetWizard();
    set({
      bootStatus: "UNAUTHENTICATED",
      isConnected: false,
      isConnecting: false,
      user: null,
      authStage: "qr",
      phoneNumber: "",
      phoneCodeHash: null,
    });
    await get().loadSavedAccounts();
  },

  init: async () => {
    set({ isConnecting: true, bootStatus: "BOOTING" });

    try {
      await get().loadSavedAccounts();

      const session = await getSavedSession();
      if (!session) {
        set({
          isConnecting: false,
          isConnected: false,
          user: null,
          authStage: "qr",
          bootStatus: "UNAUTHENTICATED",
        });
        return false;
      }

      // Check cached user profile first for instant UI response
      const cachedUser = await getSavedUserProfile();
      if (cachedUser) {
        set({ user: cachedUser });
      }

      const isConnected = await tgStreamClient.init();
      if (isConnected && tgStreamClient.user) {
        set({
          isConnected: true,
          isConnecting: false,
          user: tgStreamClient.user,
          authStage: "authorized",
          bootStatus: "AUTHENTICATED",
        });
        await get().loadSavedAccounts();
        return true;
      }
    } catch (e) {
      console.error("[useAuthStore] Auto-login bootstrap error:", e);
    }

    set({
      isConnecting: false,
      isConnected: false,
      authStage: "qr",
      bootStatus: "UNAUTHENTICATED",
    });
    return false;
  },

  setAuthStage: (stage) => set({ authStage: stage }),
  setPhoneStep: (step) => set({ phoneStep: step }),
  setUser: (user) => {
    set({
      user,
      isConnected: !!user,
      authStage: user ? "authorized" : "qr",
      bootStatus: user ? "AUTHENTICATED" : "UNAUTHENTICATED",
    });
    get().loadSavedAccounts();
  },

  logout: async () => {
    await tgStreamClient.destroy();
    await clearSavedSession();
    useDriveStore.getState().resetDrive();
    useChannelWizardStore.getState().resetWizard();
    set({
      bootStatus: "UNAUTHENTICATED",
      isConnected: false,
      isConnecting: false,
      user: null,
      authStage: "qr",
      phoneNumber: "",
      phoneCodeHash: null,
    });
    await get().loadSavedAccounts();
  },
}));
