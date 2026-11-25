# Session Handoff & Continuity Guide

> **Target Audience:** Any incoming AI agent (Google AI Studio, Gemini 2.0 / 1.5, Claude, Cursor, Antigravity, or Copilot) taking over this repository. Read this file first before touching any code.

---

## 1. Quick Repository Facts
- **Project Name:** Vaultgram
- **Path:** `/home/hussain/Vaultgram`
- **Active Git Branch:** `main` (Synchronized with `origin/main` at `https://github.com/xrnix/Vaultgram.git`)
- **Hosting Target:** Cloudflare Pages (Static SPA) connected to `main`
- **Core Engine:** 100% Client-Side React 18 + Vite 6 + TypeScript 5 + `teleproto` (`^1.233.0`)
- **License:** GNU Affero General Public License v3.0 (AGPLv3)
- **Local Dev Server:** `http://localhost:5173/`

---

## 2. Reading Order for the New Agent
1. **[`AGENTS.md`](file:///home/hussain/Vaultgram/AGENTS.md)**: Non-negotiable rules.
   - **CRITICAL:** **NEVER execute `git commit` or `git push` autonomously.** Only commit/push when the user explicitly requests it in prompt text.
   - **Zero Backend:** Everything runs 100% client-side in the browser. Never introduce a Node/Express backend or intermediary proxy server.
   - **Commit Author:** Always use `--author="xrnix <237821263+xrnix@users.noreply.github.com>"` when committing upon user request.
2. **[`CURRENT_STATE.md`](file:///home/hussain/Vaultgram/CURRENT_STATE.md)**: Live verification state, completed subsystems, and component ownership.
3. **[`ARCHITECTURE.md`](file:///home/hussain/Vaultgram/ARCHITECTURE.md)**: Deep technical reference for data contracts, MTProto pipelines, and streaming mechanics.
4. **[`DECISIONS.md`](file:///home/hussain/Vaultgram/DECISIONS.md)**: Architecture Decision Records (ADR-001 through ADR-011).
5. **[`TODO.md`](file:///home/hussain/Vaultgram/TODO.md)**: Active engineering roadmap.

---

## 3. What Was Recently Completed & Live on `origin/main`
1. **Monochrome Stealth Origami Delta Brand Mark**:
   - Extracted and vectorized user's bespoke logo from `~/Downloads/LoGo.png`.
   - Generated high-DPI transparent assets: `public/logo.png`, `public/logo-192.png`, `public/favicon.ico`, `public/favicon.svg`.
   - Integrated `<VaultgramLogo />` (`src/components/ui/vaultgram-logo.tsx`) into Auth Portal, App boot loader, Sidebar, and Settings Modal.
2. **Teleproto Migration**:
   - Replaced archived `telegram` (GramJS) with `teleproto` (`^1.233.0`) for active ES module bundling and MTProto WebSocket connection stability.
3. **Dual-Path Streaming Pipeline**:
   - **ServiceWorker StreamBridge** (`src/lib/stream/stream-bridge.ts`): Intercepts `/stream/:channelId/:messageId` and feeds HTML5 video range requests (`bytes=X-Y`) via 512KB MTProto chunks.
   - **In-Browser Demuxer & MSE** (`src/lib/streaming/`): Handles non-FastStart MP4s using `mp4box.js` and MediaSource Extensions.
   - **Cross-DC Auto-Healing**: Automatic `auth.exportAuthorization` / `auth.importAuthorization` when streaming media hosted on non-primary Telegram DCs (DC 1, 2, 4, 5).
   - **Token Refresh**: Automatic `FILE_REFERENCE_EXPIRED` token recovery querying parent messages without interrupting playback.
   - **DC Location Tagging**: Added Datacenter location indicator to video player metadata.
4. **Physical Craftsmanship Design System**:
   - Replaced generic AI-style pill badges with **Optical Hardware Status Indicators** (dark inset badge with a 1.5px luminous emerald/carmine LED pin-dot and tracked uppercase mono).
   - Card depth with dark anodized brushed obsidian gradients (`.specimen-card`) and 1px micro-milled top bevel highlights (`inset 0 1px 0 rgba(255, 255, 255, 0.12)`).
   - High-contrast 24K Auric Champagne primary upload CTA and archival extension badges.
5. **Documentation & Licensing**:
   - Official GNU AGPLv3 [`LICENSE`](file:///home/hussain/Vaultgram/LICENSE).
   - Comprehensive systems engineering [`README.md`](file:///home/hussain/Vaultgram/README.md).

---

## 4. Current Verification State
- **TypeScript (`npx tsc --noEmit`):** Exit code 0 (Zero errors).
- **Vite Build (`npm run build`):** Exit code 0 (Generates clean `dist/` bundle in ~10s).
- **Git Working Tree:** Clean. All files tracked and synchronized with `origin/main`.

---

## 5. Next Steps on the Horizon
1. **Semantic Media Spectrum**:
   - Replace the monochromatic yellow/champagne card badges with a multi-chromatic jewel/mineral palette so files are instantly recognizable at a glance:
     - 🎬 Videos: Electric Cyan (`#38bdf8`)
     - 🎵 Audio: Sunset Amber (`#f59e0b`)
     - 🖼️ Images: Bioluminescent Emerald (`#10b981`)
     - 📄 Documents: Crisp Slate Ice (`#93c5fd`)
     - 📦 Archives: Burnished Tangerine (`#fb923c`)
2. **Architecture A (Direct Stream WritableStream)**:
   - Wire `showSaveFilePicker()` to write MTProto download chunks straight to disk for files >1.5 GB on Chromium browsers to prevent in-memory tab memory pressure.
