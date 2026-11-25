# Vaultgram — Current State & Active Milestone

## 1. Active Milestone
**Milestone:** Production Polish, Semantic Color Spectrum & Direct Storage Streaming.
**Active Focus:**
- Exploring File System Access API (`showSaveFilePicker` + `WritableStream`) for direct zero-RAM multi-gigabyte disk writes.
- Semantic media spectrum shipped: a single `src/lib/media-tokens.ts` register now drives card wells, extension stamps, list-row spines, sidebar indices, breadcrumbs, and mobile category dots (emerald images, sapphire video, amber audio, slate-ice docs, tangerine archives).
- Restraint pass shipped: one type scale (`type-display` / `type-title` / `type-body` / `type-meta`), surface steps instead of outlines, a single champagne accent, and the removal of fabricated telemetry copy and the cursor-tracking spotlight.
- Continuous Cloudflare Pages static edge verification.

---

## 2. Completed Features & Subsystems

| Subsystem | Status | Key Components / Ownership |
| :--- | :--- | :--- |
| **Official Brand Identity** | Verified | Monochrome stealth origami delta logo (`<VaultgramLogo />`), high-DPI transparent assets (`public/logo.png`, `public/logo-192.png`, `public/favicon.ico`, `public/favicon.svg`), brand headers in Auth Portal, App boot loader, and Sidebar. |
| **MTProto Engine (`teleproto`)** | Verified | Active modern MTProto fork (`teleproto` `^1.233.0`) over WebSocket (`ConnectionWebSocketObfuscated`). Stable connection pooling across Telegram DCs (1 through 5). |
| **Auth Portal (Stage 1)** | Verified | Instant QR login, Phone + SMS OTP, SRP 2FA password verification (`TwoFaDialog`), GramJS/Teleproto StringSession export & import, encrypted session caching in IndexedDB (`session.ts`, `auth-store.ts`, `auth-portal.tsx`). |
| **Channel Wizard (Stage 2)** | Verified | Multi-channel selection, Saved Messages support, uniform channel rows, search filter, rate-limit recovery (`channel-wizard-store.ts`, `channel-wizard.tsx`). |
| **Dual-Zone Drive (Stage 3)** | Verified | Zone A (Top channel carousel + Unified multi-channel aggregation), Zone B (Categories, custom virtual folders), Main Canvas (Virtualized grid & dense list views, context menu, preview lightbox) (`sidebar.tsx`, `drive-canvas.tsx`, `drive-toolbar.tsx`, `drive-store.ts`). |
| **Dual-Path Media Streaming** | Verified | **Path A:** ServiceWorker virtual HTTP range request bridge (`/stream/:channelId/:messageId`) translating standard `bytes=X-Y` requests into 512KB MTProto chunks. **Path B:** In-browser MP4Box demuxer and MSE SourceBuffer segmenter for non-FastStart MP4s. Real-time telemetry HUD with active DC tags (`video-player-modal.tsx`, `stream-bridge.ts`, `mse-stream-controller.ts`). |
| **Cross-DC Auto-Healing** | Verified | Automatic cross-DC authorization transfer (`auth.exportAuthorization` / `auth.importAuthorization`) when media is hosted on non-primary DCs. Automatic `FILE_REFERENCE_EXPIRED` recovery querying parent message locations without interrupting playback (`media-refresher.ts`, `telegram-range-reader.ts`). |
| **Multi-Worker Transfer Engine** | Verified | 4-worker chunked uploader with sliding 500ms speed/ETA telemetry and cancellation; 4-worker parallel chunk downloader with in-order Blob construction and auto-revoking memory URLs (`uploader.ts`, `downloader.ts`, `transfer-dock.tsx`). |
| **Zero-Backend Cloud Sync** | Verified | Auto-discovery/creation of private Telegram config channel (`"Vaultgram Vault (Do Not Delete)"` tagged `[VAULTGRAM_CONFIG_V1]`), singleton promise mutex, 3-step idempotent resolution, 3s debounced optimistic write (`syncStore.ts`). |
| **Physical Craftsmanship Design** | Verified | Tonal surface stack (`#08080a` → `#111114`), hairline borders (`--line-1/2/3`), recessed insets, a four-step type scale, and a single Auric Champagne accent reserved for primary actions. Outline-on-everything, fabricated telemetry copy, and decorative spotlight layers were removed. |
| **Media Inspection Suite** | Verified | In-browser PDF reader (`pdfjs-dist`), in-memory ZIP archive explorer (`jszip`), high-DPI image lightbox with prefetching, syntax-highlighted code/text previewer (`pdf-viewer-modal.tsx`, `archive-viewer-modal.tsx`, `text-viewer-modal.tsx`). |
| **Universal Command Center** | Verified | Keyboard-first spotlight palette (`Cmd+K` / `Ctrl+K`), instant search (`/`), quick shortcuts sheet (`?`), real-time DC latency and socket telemetry (`command-palette.tsx`, `network-monitor-modal.tsx`). |
| **Licensing & Documentation** | Verified | Official GNU Affero General Public License v3.0 ([`LICENSE`](file:///home/hussain/Vaultgram/LICENSE)) and comprehensive systems architecture documentation ([`README.md`](file:///home/hussain/Vaultgram/README.md)). |

---

## 3. Important Architectural Files

- [`src/lib/telegram/client.ts`](file:///home/hussain/Vaultgram/src/lib/telegram/client.ts): MTProto WebSocket client (`teleproto`), DC connection gateways, QR/Phone auth state machine.
- [`src/lib/telegram/session.ts`](file:///home/hussain/Vaultgram/src/lib/telegram/session.ts): Typed IndexedDB persistence for sessions, config, channels, and batch file caches.
- [`src/lib/telegram/indexer.ts`](file:///home/hussain/Vaultgram/src/lib/telegram/indexer.ts): Iterative media indexer with 60ms non-blocking yields and `DriveFile` normalizer.
- [`src/lib/telegram/syncStore.ts`](file:///home/hussain/Vaultgram/src/lib/telegram/syncStore.ts): Zero-backend cloud config sync using private Telegram system channel.
- [`src/lib/telegram/transfer/uploader.ts`](file:///home/hussain/Vaultgram/src/lib/telegram/transfer/uploader.ts): 4-worker MTProto chunked file uploader with cancellation and live progress.
- [`src/lib/telegram/transfer/downloader.ts`](file:///home/hussain/Vaultgram/src/lib/telegram/transfer/downloader.ts): 4-worker parallel MTProto chunk downloader with ordered assembly.
- [`src/lib/stream/stream-bridge.ts`](file:///home/hussain/Vaultgram/src/lib/stream/stream-bridge.ts): ServiceWorker message bridge for HTTP range request interception.
- [`src/lib/streaming/mse-stream-controller.ts`](file:///home/hussain/Vaultgram/src/lib/streaming/mse-stream-controller.ts): MediaSource/SourceBuffer controller with serialized appends and backpressure loop.
- [`src/lib/streaming/mp4-demux-segmenter.ts`](file:///home/hussain/Vaultgram/src/lib/streaming/mp4-demux-segmenter.ts): In-browser ISO-BMFF box parser, moov header probe, and sample segmenter.
- [`src/components/ui/vaultgram-logo.tsx`](file:///home/hussain/Vaultgram/src/components/ui/vaultgram-logo.tsx): Reusable stealth origami delta brand component.
- [`src/lib/media-tokens.ts`](file:///home/hussain/Vaultgram/src/lib/media-tokens.ts): Semantic media token register (hue / 10% wash / 26% hairline per file class) consumed by every file surface, plus `media-glyph.tsx` for the tinted category glyph.
- [`src/components/drive/video-player-modal.tsx`](file:///home/hussain/Vaultgram/src/components/drive/video-player-modal.tsx): Pure-browser video player with telemetry HUD, DC indicators, and fallback controls.

---

## 4. Current Verification State

- **TypeScript Typecheck (`npx tsc --noEmit`):** Clean (0 errors, exit code 0).
- **Production Build (`npm run build`):** Clean (Built in ~9.0s, output in `dist/`).
- **Remote Sync:** Main branch synchronized with `origin/main` on GitHub (`https://github.com/xrnix/Vaultgram.git`).
- **Deployment Target:** Cloudflare Pages (Static SPA) connected to `main`.
- **Local Dev Server:** Runs on `http://localhost:5173/`.

---

## 5. Recent Key Milestones
1. **Official Monochrome Brand Identity:** Integrated the stealth delta logo across the Auth Portal, App boot loader, Sidebar, and generated multi-resolution web favicons (`favicon.ico`, `favicon.svg`, `logo-192.png`, `logo.png`).
2. **Teleproto Migration:** Upgraded the core MTProto transport from archived GramJS to `teleproto` with enhanced WebSocket stability.
3. **Physical Materiality UI:** Eliminated AI-style neon/pill badges in favor of precision optical LED hardware indicators, dark anodized brushed obsidian gradients with micro-milled bevel highlights, and high-contrast auric champagne action anchors.
4. **Comprehensive Documentation & AGPLv3 Licensing:** Pushed full GNU AGPLv3 license and comprehensive architectural `README.md`.
5. **Semantic Media Spectrum & Keyboard Access:** Introduced the media-token register, tinted category wells/stamps/spines across grid, list, sidebar, breadcrumbs and mobile strip; cards and rows became keyboard-focusable with composed accessible names, and the Upload CTA was restored to its documented auric primary anchor.
6. **Restraint Pass (Anti-Slop UI):** Replaced outline-on-everything chrome with a four-step surface stack and one hairline weight; introduced a four-step type scale; deleted costume labels (`DIRECTORY_STATUS :: 00`, `TRANSFER_MODE :: ASSET_INGESTION`, `Archival Volume`), the fake `files.length / 150` storage gauge, and the per-`pointermove` cursor spotlight; rebuilt the command palette, auth portal, toolbar, sidebar, batch bar, transfer dock, audio bar and dropzone on the new material; fixed silently-dropped `/92` and `/98` opacity utilities.
