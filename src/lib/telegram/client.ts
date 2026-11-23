// @ts-ignore - teleproto exports
import { TelegramClient, Api, WebSocketTransport, password as tgPassword } from "teleproto";
// @ts-ignore
import { StringSession } from "teleproto/sessions";

const computeCheck = tgPassword.computeCheck;
import {
  getSavedSession,
  getTgConfig,
  getTgConfigSync,
  setSavedSession,
  setSavedUserProfile,
  clearSavedSession,
  saveAccount,
  TelegramUserProfile,
  ChannelMeta,
} from "./session";

export class TelegramBrowserWebSocket {
  // Legacy alias for WebSocketTransport
}

export class ConnectionWebSocketObfuscated {
  // Legacy alias for WebSocketTransport
}

export type StatusListener = (status: {
  isConnected: boolean;
  isConnecting: boolean;
  user: TelegramUserProfile | null;
}) => void;

export class TgStreamClient {
  public client: any = null;
  public isConnected = false;
  public isConnecting = false;
  public user: TelegramUserProfile | null = null;
  public phoneCodeHash: string | null = null;
  public phoneNumber: string | null = null;

  private statusListeners = new Set<StatusListener>();
  public docCache = new Map<string, any>();
  public channelEntityCache = new Map<string, any>();
  public dcSenderCache = new Map<number, any>();

  onStatusChange(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener({ isConnected: this.isConnected, isConnecting: this.isConnecting, user: this.user });
    return () => this.statusListeners.delete(listener);
  }

  notifyStatus() {
    for (const listener of this.statusListeners) {
      listener({ isConnected: this.isConnected, isConnecting: this.isConnecting, user: this.user });
    }
  }

  createClient(sessionStr = "") {
    const config = getTgConfigSync();
    const stringSession = new StringSession(sessionStr || "");
    if (!sessionStr) {
      // Pre-assign primary production DC 4 for instant WebSocket handshake
      stringSession.setDC(4, "149.154.167.91", 443);
    }

    // Clean up any stale/expired temporary PFS keys from previous localStorage implementations
    if (typeof window !== "undefined") {
      for (let i = 1; i <= 5; i++) {
        try {
          localStorage.removeItem(`vg_dc_${i}_auth_key`);
        } catch (_) {}
      }
    }

    const client = new TelegramClient(stringSession, Number(config.apiId), String(config.apiHash), {
      transport: new WebSocketTransport(),
      timeout: 25, // Generous dial/handshake timeout for high-latency transatlantic DCs (e.g. Pluto DC 1)
      connectionRetries: 5,
      downloadPool: {
        idleTimeoutMs: 300_000, // 5 minutes idle timeout so media DC connections stay warm
        sessionStartupDelayMs: 100, // Fast ramp-up across parallel WebSockets on high-RTT DCs
        download: {
          sessions: 6, // 6 parallel media WebSocket sessions per DC (saturates transatlantic DC 1 Pluto BDP)
        },
      },
      autoReconnect: true,
      deviceModel: "Vaultgram React Web",
      systemVersion: "Web/Linux",
      appVersion: "2.0.0",
      langCode: "en",
      systemLangCode: "en",
    });

    // ─────────────────────────────────────────────────────────────────────────
    // FIX: Extend Teleproto Session watchdog timers & initial online grace period
    //
    // By default, Teleproto's Session watchdog sets:
    //   - readDisconnect = rtt * 3.5 (~7.0s)
    //   - setOnline() pulls lastPongAt and readMark back so BOTH pingDisconnect
    //     and readDisconnect expire in just `timers.rtt` (2.0s!).
    // On high-latency transatlantic DCs like Pluto DC 1 (Miami), WebSocket
    // handshake + ImportAuthorization + 512 KiB chunk transfers easily exceed
    // 2.0s–7.0s, causing premature socket drops and stale-bytes AUTH_BYTES_INVALID
    // retries. Extending read/ping disconnect floors to 60s and giving non-main
    // media senders a 15s initial RTT grace window eliminates spurious disconnects.
    // ─────────────────────────────────────────────────────────────────────────
    try {
      const tempSender = (client as any)._makeSender(0, () => {});
      (client as any)._dcenters?.states?.delete(0);
      const SessionProto = Object.getPrototypeOf(tempSender);
      if (SessionProto && typeof SessionProto.timers === "function" && !SessionProto.__vg_patched) {
        SessionProto.__vg_patched = true;
        const origTimers = SessionProto.timers;
        SessionProto.timers = function (now: number) {
          const res = origTimers.call(this, now);
          if (res) {
            if (typeof res.readDisconnect === "number") {
              res.readDisconnect = Math.max(res.readDisconnect, 60);
            }
            if (typeof res.pingDisconnect === "number") {
              res.pingDisconnect = Math.max(res.pingDisconnect, 60);
            }
            if (!this.isMain && typeof res.rtt === "number") {
              res.rtt = Math.max(res.rtt, 15);
            }
            if (!this.isMain && typeof res.pingMust === "number") {
              res.pingMust = Math.max(res.pingMust, 15);
            }
          }
          return res;
        };

        if (typeof SessionProto.setOnline === "function") {
          const origSetOnline = SessionProto.setOnline;
          SessionProto.setOnline = function (link: any, online: boolean, now: number) {
            origSetOnline.call(this, link, online, now);
            const timers = this.timers(now);
            const minGraceMs = (this.isMain ? 12 : 20) * 1000;
            const minPongAt = now - (timers.pingDisconnect * 1000 - minGraceMs);
            const minReadAt = now - (timers.readDisconnect * 1000 - minGraceMs);
            if (link.lastPongAt < minPongAt) {
              link.lastPongAt = minPongAt;
            }
            if (typeof link.markRead === "function" && link.readMark < minReadAt) {
              link.markRead(minReadAt);
            }
          };
        }
      }
    } catch (_) {}

    (client as any).invalidateDcAuthKey = async (dcId: number) => {
      try {
        // Never wipe the home DC auth key (that would log out the user session)
        if (dcId === client.session.dcId) {
          return;
        }
        if (typeof window !== "undefined") {
          localStorage.removeItem(`vg_dc_${dcId}_auth_key`);
        }
        stringSession.setAuthKey(undefined, dcId);
        const dcState = (client as any)._dcenters?.get(dcId);
        if (dcState) {
          dcState.unauthorize();
          if (dcState.authKey && typeof dcState.authKey.setKey === "function") {
            await dcState.authKey.setKey(undefined).catch(() => {});
          }
        }
        // Purge ALL pooled slots (bare + shifted media/download/upload slots) for this DC
        const pool = (client as any)._network;
        if (pool?.slots instanceof Map) {
          for (const shiftedKey of Array.from(pool.slots.keys()) as number[]) {
            if (shiftedKey % 10000 === dcId) {
              pool.removeSession(shiftedKey);
            }
          }
        } else if (typeof pool?.removeSession === "function") {
          pool.removeSession(dcId);
        }
      } catch (_) {}
    };

    // ─────────────────────────────────────────────────────────────────────────
    // FIX: Reliable Cross-DC Authorization & Media Cluster Routing
    //
    // 1. Telegram upload.getFile on a foreign DC (e.g. Pluto DC 1 when home DC
    //    is Venus DC 2) STRICTLY requires auth.exportAuthorization ->
    //    auth.importAuthorization to succeed on that DC's auth key. Swallowing
    //    errors returns an unauthorized sender that immediately fails with
    //    401 AUTH_KEY_UNREGISTERED.
    // 2. Only route to the dedicated `-1` media cluster (e.g. pluto-1.web.telegram.org)
    //    after the DC's auth key is BOTH created AND authorized; initial DH +
    //    ImportAuthorization always runs against the primary DC WebSocket host
    //    (pluto.web.telegram.org), with automatic fallback if `-1` fails.
    // 3. Retry Export/ImportAuthorization with fresh single-use bytes on
    //    transient failures / AUTH_BYTES_INVALID.
    // ─────────────────────────────────────────────────────────────────────────
    (client as any)._connectSender = async function (
      sender: any,
      dcId: number,
      connection?: any,
      mediaCluster = false
    ) {
      const connectToDc = async (useMediaCluster: boolean) => {
        const conn =
          connection ??
          (client as any)._createConnection(
            await client.getDC(dcId, useMediaCluster && !!sender.authKey.getKey())
          );
        await sender.connect(conn);
      };

      try {
        if (!connection && (client as any)._addresses.isCdn(dcId)) {
          await (client as any)._ensureCdnKeys();
          const address = (client as any)._addresses.cdn(dcId);
          if (!address) throw new Error(`No address for CDN dc ${dcId}`);
          await sender.connect((client as any)._createConnection(address));
          return sender;
        }

        const dcState = (client as any)._dcenters.get(dcId);
        const isAlreadyAuthorized = dcId === client.session.dcId || !!dcState?.authorized;
        const wantMediaCluster = mediaCluster && !!sender.authKey.getKey() && isAlreadyAuthorized;

        try {
          await connectToDc(wantMediaCluster);
        } catch (connectErr) {
          if (wantMediaCluster && !connection) {
            console.warn(
              `[TgStreamClient] Media cluster connection for DC ${dcId} failed; falling back to primary DC ${dcId} gateway:`,
              connectErr
            );
            await connectToDc(false);
          } else {
            throw connectErr;
          }
        }

        if (dcId !== client.session.dcId) {
          await dcState.authorize(async () => {
            let lastAuthErr: unknown;
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                const auth: any = await client.invoke(new Api.auth.ExportAuthorization({ dcId }));
                const authBytes = Buffer.isBuffer(auth.bytes)
                  ? auth.bytes
                  : Buffer.from(auth.bytes);
                await sender.send(
                  new Api.auth.ImportAuthorization({
                    id: auth.id,
                    bytes: authBytes,
                  })
                );
                return;
              } catch (authErr: any) {
                lastAuthErr = authErr;
                const msg = String(authErr?.errorMessage || authErr?.message || authErr);
                if (msg.includes("DC_ID_INVALID")) {
                  return;
                }
                console.warn(
                  `[TgStreamClient] DC ${dcId} Export/ImportAuthorization attempt ${attempt}/3 failed: ${msg}`
                );
                if (attempt < 3) {
                  await new Promise((r) => setTimeout(r, 400 * attempt));
                }
              }
            }
            throw lastAuthErr;
          });
        }
        return sender;
      } catch (error: any) {
        if (error?.errorMessage === "DC_ID_INVALID") return sender;
        (client as any)._addresses.fail(dcId, mediaCluster);
        await sender.disconnect().catch(() => {});
        throw error;
      }
    };

    return client;
  }

  private initPromise: Promise<boolean> | null = null;
  private qrLoginRunId = 0;

  private isAuthInvalidError(err: unknown): boolean {
    const anyErr = err as { errorMessage?: string; message?: string; code?: number } | null;
    const msg = String(anyErr?.errorMessage || anyErr?.message || err || "").toUpperCase();
    return (
      anyErr?.code === 401 ||
      msg.includes("AUTH_KEY_UNREGISTERED") ||
      msg.includes("SESSION_REVOKED") ||
      msg.includes("AUTH_KEY_INVALID") ||
      msg.includes("SESSION_EXPIRED") ||
      msg.includes("USER_DEACTIVATED") ||
      msg.includes("AUTH_KEY_PERM_EMPTY")
    );
  }

  private async disposeClient(target?: any) {
    const clientToDispose = target || this.client;
    if (!clientToDispose) return;
    if (!target || target === this.client) {
      this.client = null;
    }
    try {
      await clientToDispose.disconnect();
    } catch {}
    try {
      await clientToDispose.destroy();
    } catch {}
  }

  async init(): Promise<boolean> {
    if (this.client && this.isConnected && this.client.connected) return true;
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const sessionStr = await getSavedSession();
        if (!sessionStr) {
          this.isConnected = false;
          this.isConnecting = false;
          this.notifyStatus();
          return false;
        }

        const config = await getTgConfig();
        if (!config.apiId || !config.apiHash) {
          this.isConnected = false;
          this.isConnecting = false;
          this.notifyStatus();
          return false;
        }

        this.isConnecting = true;
        this.notifyStatus();

        await this.disposeClient();

        this.client = this.createClient(sessionStr);

        const connectPromise = this.client.connect();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Telegram MTProto connection timeout")), 10000)
        );

        await Promise.race([connectPromise, timeoutPromise]);

        let authorized = false;
        try {
          authorized = await this.client.isUserAuthorized();
        } catch (authCheckErr: unknown) {
          if (this.isAuthInvalidError(authCheckErr)) {
            console.warn("[TgStreamClient] Saved session authorization key is no longer valid. Clearing session.");
            await this.disposeClient();
            await clearSavedSession();
            this.user = null;
            this.isConnected = false;
            this.isConnecting = false;
            this.notifyStatus();
            return false;
          }
          throw authCheckErr;
        }

        if (authorized) {
          const me = await this.client.getMe();
          this.user = {
            id: String(me.id || ""),
            firstName: me.firstName || "",
            lastName: me.lastName || "",
            username: me.username || "",
            phone: me.phone || "",
          };
          this.isConnected = true;
          this.isConnecting = false;

          const currentSession = this.client.session.save();
          if (currentSession) {
            await setSavedSession(currentSession);
            await setSavedUserProfile(this.user);
            await saveAccount({
              id: this.user.id,
              firstName: this.user.firstName,
              lastName: this.user.lastName,
              username: this.user.username,
              phone: this.user.phone,
              sessionString: currentSession,
              apiId: Number(config.apiId),
              apiHash: String(config.apiHash),
              lastUsed: Date.now(),
            });
          }

          this.notifyStatus();
          return true;
        } else {
          console.warn("[TgStreamClient] Saved session is unauthorized. Clearing stale session.");
          await this.disposeClient();
          await clearSavedSession();
          this.user = null;
          this.isConnected = false;
          this.isConnecting = false;
          this.notifyStatus();
          return false;
        }
      } catch (err: unknown) {
        if (this.isAuthInvalidError(err)) {
          console.warn("[TgStreamClient] MTProto session expired or unregistered. Resetting to login screen.");
          await clearSavedSession();
          this.user = null;
        } else {
          console.warn("[TgStreamClient] Could not restore TelegramClient session:", err);
        }
        await this.disposeClient();
        this.isConnected = false;
        this.isConnecting = false;
        this.notifyStatus();
        return false;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  // 1. High-Speed QR Code Login Flow
  async startQrLogin(
    onQrUrl: (url: string) => void,
    onNeeds2FA: (hint?: string) => Promise<string>
  ): Promise<{ session: string; user: TelegramUserProfile }> {
    const runId = ++this.qrLoginRunId;
    const config = await getTgConfig();
    await this.disposeClient();
    if (runId !== this.qrLoginRunId) {
      throw new Error("QR_LOGIN_CANCELLED");
    }
    const qrClient = this.createClient("");
    this.client = qrClient;

    const connectPromise = this.client.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Telegram MTProto connection timed out")), 6000)
    );
    await Promise.race([connectPromise, timeoutPromise]);

    const apiId = Number(config.apiId);
    const apiHash = String(config.apiHash);

    try {
      let isScanningComplete = false;
      let user: any = null;

      const updateHandler = (update: any) => {
        if (update instanceof Api.UpdateLoginToken) {
          isScanningComplete = true;
        }
      };
      this.client.addEventHandler(updateHandler);

      const tokenLoop = async () => {
        while (!isScanningComplete && this.client) {
          try {
            const tokenRes: any = await this.client.invoke(
              new Api.auth.ExportLoginToken({
                apiId,
                apiHash,
                exceptIds: [],
              })
            );

            if (tokenRes instanceof Api.auth.LoginToken) {
              const rawTok = tokenRes.token;
              const base64 =
                typeof rawTok === "string"
                  ? rawTok
                  : Buffer.isBuffer(rawTok) || (rawTok && typeof rawTok === "object")
                  ? Buffer.from(rawTok).toString("base64")
                  : String(rawTok);

              const tokenStr = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
              const tgUrl = `tg://login?token=${tokenStr}`;
              if (onQrUrl) onQrUrl(tgUrl);

              const expires = tokenRes.expires || Date.now() / 1000 + 30;
              const waitSec = Math.max(5, Math.min(expires - Date.now() / 1000 - 3, 25));
              await new Promise((r) => setTimeout(r, waitSec * 1000));
            } else if (tokenRes instanceof Api.auth.LoginTokenSuccess) {
              isScanningComplete = true;
              user = (tokenRes.authorization as any).user;
              break;
            } else if (tokenRes instanceof Api.auth.LoginTokenMigrateTo) {
              await this.client._switchDC(tokenRes.dcId);
              const imported: any = await this.client.invoke(
                new Api.auth.ImportLoginToken({ token: tokenRes.token })
              );
              if (imported instanceof Api.auth.LoginTokenSuccess) {
                isScanningComplete = true;
                user = (imported.authorization as any).user;
                break;
              }
            }
          } catch (loopErr: any) {
            const msg = String(loopErr.errorMessage || loopErr.message || loopErr);
            if (msg.includes("SESSION_PASSWORD_NEEDED")) {
              isScanningComplete = true;
              if (onNeeds2FA) {
                const pass = await onNeeds2FA();
                if (pass) {
                  user = await this.signInWithPassword(pass);
                  break;
                }
              }
            }
            if (isScanningComplete) break;
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
      };

      tokenLoop();

      while (!isScanningComplete && !user && this.client) {
        await new Promise((r) => setTimeout(r, 1200));
        try {
          const checkRes: any = await this.client.invoke(
            new Api.auth.ExportLoginToken({
              apiId,
              apiHash,
              exceptIds: [],
            })
          );
          if (checkRes instanceof Api.auth.LoginTokenSuccess) {
            user = (checkRes.authorization as any).user;
            isScanningComplete = true;
          } else if (checkRes instanceof Api.auth.LoginTokenMigrateTo) {
            await this.client._switchDC(checkRes.dcId);
            const imported: any = await this.client.invoke(
              new Api.auth.ImportLoginToken({ token: checkRes.token })
            );
            if (imported instanceof Api.auth.LoginTokenSuccess) {
              user = (imported.authorization as any).user;
              isScanningComplete = true;
            }
          }
        } catch (authErr: any) {
          const msg = String(authErr.errorMessage || authErr.message || authErr);
          if (msg.includes("SESSION_PASSWORD_NEEDED")) {
            isScanningComplete = true;
            if (onNeeds2FA) {
              const pass = await onNeeds2FA();
              if (pass) {
                user = await this.signInWithPassword(pass);
                break;
              }
            }
          }
        }
      }

      this.client.removeEventHandler(updateHandler);

      if (!user) {
        user = await this.client.getMe();
      }

      const cleanUser: TelegramUserProfile = {
        id: String(user.id || ""),
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
        phone: user.phone || "",
      };

      const saved = this.client.session.save();
      await setSavedSession(saved);
      this.user = cleanUser;
      await setSavedUserProfile(cleanUser);
      await saveAccount({
        id: cleanUser.id,
        firstName: cleanUser.firstName,
        lastName: cleanUser.lastName,
        username: cleanUser.username,
        phone: cleanUser.phone,
        sessionString: saved,
        apiId: Number(config.apiId),
        apiHash: String(config.apiHash),
        lastUsed: Date.now(),
      });
      this.isConnected = true;
      this.notifyStatus();

      return { session: saved, user: cleanUser };
    } catch (err) {
      console.error("QR Login error:", err);
      throw err;
    }
  }

  // 2. Send Login Code via Phone Number
  async sendCode(phoneNumber: string) {
    this.qrLoginRunId++;
    const config = await getTgConfig();
    this.phoneNumber = phoneNumber.trim();
    await this.disposeClient();
    this.client = this.createClient("");
    await this.client.connect();

    const res = await this.client.sendCode(
      {
        apiId: config.apiId,
        apiHash: config.apiHash,
      },
      this.phoneNumber
    );

    this.phoneCodeHash = res.phoneCodeHash;
    return res;
  }

  // 3. Sign In with Phone Code
  async signIn(phoneCode: string, password = ""): Promise<TelegramUserProfile> {
    if (!this.client || !this.phoneCodeHash || !this.phoneNumber) {
      throw new Error("Please request a login code first.");
    }

    try {
      const config = await getTgConfig();
      await this.client.invoke(
        new Api.auth.SignIn({
          phoneNumber: this.phoneNumber,
          phoneCodeHash: this.phoneCodeHash,
          phoneCode: phoneCode.trim(),
        })
      );

      const me = await this.client.getMe();
      const cleanUser: TelegramUserProfile = {
        id: String(me.id || ""),
        firstName: me.firstName || "",
        lastName: me.lastName || "",
        username: me.username || "",
        phone: me.phone || "",
      };

      const saved = this.client.session.save();
      await setSavedSession(saved);
      this.user = cleanUser;
      await setSavedUserProfile(cleanUser);
      await saveAccount({
        id: cleanUser.id,
        firstName: cleanUser.firstName,
        lastName: cleanUser.lastName,
        username: cleanUser.username,
        phone: cleanUser.phone,
        sessionString: saved,
        apiId: Number(config.apiId),
        apiHash: String(config.apiHash),
        lastUsed: Date.now(),
      });
      this.isConnected = true;
      this.notifyStatus();
      return cleanUser;
    } catch (err: any) {
      const errMsg = String(err.errorMessage || err.message || err);
      if (errMsg.includes("SESSION_PASSWORD_NEEDED")) {
        if (password) {
          return await this.signInWithPassword(password);
        }
        throw new Error("SESSION_PASSWORD_NEEDED");
      }
      throw err;
    }
  }

  // 4. Handle 2FA Password Verification
  async signInWithPassword(password: string): Promise<TelegramUserProfile> {
    const passStr = String(password || "").trim();
    if (!passStr) {
      throw new Error("2FA Password is required.");
    }

    try {
      const config = await getTgConfig();
      const passwordSrpResult = await this.client.invoke(new Api.account.GetPassword());
      const passwordSrpCheck: any = await computeCheck(passwordSrpResult, passStr);

      // Ensure A and M1 are explicitly typed as Buffer instances for TL serialization
      if (passwordSrpCheck) {
        if (passwordSrpCheck.A && !(passwordSrpCheck.A instanceof Buffer)) {
          passwordSrpCheck.A = Buffer.from(passwordSrpCheck.A);
        }
        if (passwordSrpCheck.M1 && !(passwordSrpCheck.M1 instanceof Buffer)) {
          passwordSrpCheck.M1 = Buffer.from(passwordSrpCheck.M1);
        }
      }

      const checkRes = await this.client.invoke(
        new Api.auth.CheckPassword({
          password: passwordSrpCheck,
        })
      );

      const me =
        checkRes.user ||
        (checkRes.authorization && checkRes.authorization.user) ||
        (await this.client.getMe());
      const cleanUser: TelegramUserProfile = {
        id: String(me.id || ""),
        firstName: me.firstName || "",
        lastName: me.lastName || "",
        username: me.username || "",
        phone: me.phone || "",
      };

      const saved = this.client.session.save();
      await setSavedSession(saved);
      this.user = cleanUser;
      await setSavedUserProfile(cleanUser);
      await saveAccount({
        id: cleanUser.id,
        firstName: cleanUser.firstName,
        lastName: cleanUser.lastName,
        username: cleanUser.username,
        phone: cleanUser.phone,
        sessionString: saved,
        apiId: Number(config.apiId),
        apiHash: String(config.apiHash),
        lastUsed: Date.now(),
      });
      this.isConnected = true;
      this.notifyStatus();
      return cleanUser;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("PASSWORD_HASH_INVALID")) {
        throw new Error("Invalid Two-Step Verification password");
      }
      if (message.includes("FLOOD_WAIT")) {
        throw new Error("Too many attempts. Please wait a few minutes.");
      }
      console.error("Failed to sign in with password:", err);
      throw new Error(message || "Failed to sign in with 2FA password");
    }
  }

  async destroy() {
    try {
      if (this.client) {
        await this.client.disconnect();
        await this.client.destroy();
      }
    } catch (e) {
      console.warn("Client destroy warning:", e);
    }
    this.client = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.user = null;
    this.notifyStatus();
  }

  // Fetch all user channels/chats with access hashes and Saved Messages
  async getUserChannels(): Promise<ChannelMeta[]> {
    if (!this.client || !this.isConnected) {
      const ok = await this.init();
      if (!ok) throw new Error("Client is not connected to Telegram.");
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const dialogs = await this.client.getDialogs({ limit: 100 });
        const channels: ChannelMeta[] = [];

        for (const d of dialogs) {
          const entity = d.entity;
          if (!entity) continue;

          const idStr = String(entity.id || d.id || "");
          if (!idStr) continue;

          this.channelEntityCache.set(idStr, entity);

          // Include channels, supergroups, and Saved Messages / self chat
          const isChannelOrGroup = d.isChannel || d.isGroup || entity.className === "Channel" || entity.className === "Chat";
          const isSelf = d.isUser && (entity.isSelf || entity.self || idStr === this.user?.id);

          if (isChannelOrGroup || isSelf) {
            const title = isSelf
              ? "Saved Messages"
              : d.title || entity.title || entity.firstName || "Untitled Channel";

            channels.push({
              id: idStr,
              title,
              username: entity.username || null,
              unreadCount: d.unreadCount || 0,
              accessHash: entity.accessHash ? String(entity.accessHash) : undefined,
              isSelf,
            });
          }
        }

        // Deduplicate
        const unique = new Map<string, ChannelMeta>();
        for (const ch of channels) {
          if (!unique.has(ch.id)) {
            unique.set(ch.id, ch);
          }
        }

        return Array.from(unique.values());
      } catch (err: any) {
        const msg = String(err.message || err);
        if (msg.includes("FLOOD_WAIT_")) {
          const waitSec = parseInt(msg.match(/FLOOD_WAIT_(\d+)/)?.[1] || "5", 10);
          console.warn(`[getUserChannels] Flood wait: waiting ${waitSec}s...`);
          await new Promise((r) => setTimeout(r, waitSec * 1000));
          continue;
        }
        if (msg.includes("AUTH_KEY_DUPLICATED")) {
          console.warn("[getUserChannels] AUTH_KEY_DUPLICATED detected. Reconnecting singleton client...");
          this.isConnected = false;
          await this.init();
          continue;
        }
        if (attempt === 2) throw err;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    return [];
  }

  // Create a new private storage vault (Telegram broadcast channel)
  async createStorageVault(title: string, description?: string): Promise<ChannelMeta> {
    if (!this.client || !this.isConnected) {
      const ok = await this.init();
      if (!ok) throw new Error("Client is not connected to Telegram.");
    }

    const updates: any = await this.client.invoke(
      new Api.channels.CreateChannel({
        title,
        about: description || "Vaultgram Private Storage Vault",
        broadcast: true,
      })
    );

    const chat = updates?.chats?.[0];
    if (!chat) {
      throw new Error("Channel creation did not return a valid channel entity.");
    }

    const idStr = String(chat.id);
    this.channelEntityCache.set(idStr, chat);

    return {
      id: idStr,
      title: chat.title || title,
      username: chat.username || null,
      unreadCount: 0,
      accessHash: chat.accessHash ? String(chat.accessHash) : undefined,
      isSelf: false,
    };
  }

  // Instant server-side zero-bandwidth copy/forward of messages to destination channel
  async forwardFiles(
    fromChannelId: string,
    toChannelId: string,
    messageIds: number[]
  ): Promise<void> {
    if (!this.client || !this.isConnected) {
      const ok = await this.init();
      if (!ok) throw new Error("Client is not connected to Telegram.");
    }

    let fromEntity = this.channelEntityCache.get(fromChannelId);
    if (!fromEntity) {
      try {
        fromEntity = await this.client.getEntity(parseInt(fromChannelId, 10));
      } catch {
        fromEntity = await this.client.getEntity(parseInt(`-100${fromChannelId}`, 10));
      }
    }

    let toEntity = this.channelEntityCache.get(toChannelId);
    if (!toEntity) {
      try {
        toEntity = await this.client.getEntity(parseInt(toChannelId, 10));
      } catch {
        toEntity = await this.client.getEntity(parseInt(`-100${toChannelId}`, 10));
      }
    }

    const randomIds = messageIds.map(() =>
      BigInt(Math.floor(Math.random() * 1e15) + 1)
    ) as any;

    await this.client.invoke(
      new Api.messages.ForwardMessages({
        fromPeer: fromEntity,
        toPeer: toEntity,
        id: messageIds,
        randomId: randomIds,
      })
    );
  }
}

export const tgStreamClient = new TgStreamClient();
