# Vaultgram — Prioritized Engineering Roadmap

## 1. COMPLETED MILESTONES (Verified & Live)
- [x] **Teleproto Transport Migration**: Upgraded from archived GramJS to `teleproto` (`^1.233.0`).
- [x] **Dual-Path Streaming Pipeline**: Implemented ServiceWorker `StreamBridge` HTTP range request interceptor (`/stream/:channelId/:messageId`) + fallback MSE demuxer (`mp4box.js`).
- [x] **Cross-DC Media Auto-Healing**: Automatic `auth.exportAuthorization` / `auth.importAuthorization` and `FILE_REFERENCE_EXPIRED` token recovery without playback interruption.
- [x] **Video Player DC Telemetry**: Live Datacenter (DC) geo-location indicator in video metadata modal.
- [x] **Official Brand System**: Stealth origami delta mark (`<VaultgramLogo />`, `logo.png`, `logo-192.png`, `favicon.ico`, `favicon.svg`).
- [x] **Physical Craftsmanship Design System**: Brushed obsidian gradients, micro-milled top bevels, optical hardware status indicators, auric champagne accents. Purged AI-style pill badges.
- [x] **Parallel MTProto Chunk Transfers**: 4-worker bounded pool (512 KB chunks) for uploads and downloads with memory-safe Blob cleanup.
- [x] **Zero-Backend Cloud Sync**: Automatic discovery and 3s debounced optimistic write to Telegram system channel (`[VAULTGRAM_CONFIG_V1]`).
- [x] **Open Source Architecture & AGPLv3**: Full `README.md` and GNU AGPLv3 `LICENSE`.
- [x] **Semantic Media Spectrum**: Centralised `src/lib/media-tokens.ts` token register (hue + 10% wash + 26% hairline per media class) driving card icon wells, archival extension stamps, list-row spines, sidebar indices, breadcrumb glyphs, and mobile category dots. Replaced the monochromatic stamp system.
- [x] **Keyboard-Accessible Drive Rows**: File cards and list rows are focusable (`role`/`tabIndex`/Enter/Space), expose composed accessible names, and render semantic focus rings.
- [x] **Restraint Pass (Anti-Slop UI)**: Replaced per-component outlines with a four-step surface stack and one hairline weight; added a four-step type scale; removed costume telemetry copy, the fabricated storage gauge, and the per-`pointermove` spotlight; rebuilt toolbar, sidebar, canvas, command palette, auth portal, batch bar, transfer dock, audio bar and dropzone on the new material.

---

## 2. NOW (Active Focus)
1. **Direct Stream Bridge (Architecture A - Zero-RAM Disk Writes)**:
   - For downloads >1.5 GB in Chromium browsers, integrate `showSaveFilePicker()` and stream MTProto chunks directly into the filesystem `WritableStream`, bypassing in-memory typed `Blob` arrays.

---

## 3. NEXT (Upcoming Features)
1. **Folder Batch Operations**:
   - Multi-select drag-and-drop into custom virtual folders in the sidebar.
   - Batch move across distinct Telegram channel vaults.
2. **Optional Client-Side E2EE Encryption Layer**:
   - User-passphrase derived AES-256-GCM encryption applied to chunks before MTProto transmission.
3. **PWA Offline Mode Indicator**:
   - ServiceWorker offline caching of static assets with auto-reconnect countdown when WebSocket drops.

---

## 4. KNOWN RISKS & TECHNICAL DEBT
- **Browser Memory on Low-End Tabs for Large Blob Assembly**: In-memory `Blob` assembly (Architecture B) for files approaching 2 GB may trigger tab memory limits on mobile or low-RAM devices; solved by Architecture A streaming.
- **Strict Content Security Policy (CSP)**: Ensure any future external resource or worker import complies with `public/_headers` on Cloudflare Pages.
