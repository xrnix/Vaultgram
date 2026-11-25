# Vaultgram — Permanent Agent Directives

## 1. Project Identity & Purpose
**Vaultgram** is a browser-native, zero-backend personal cloud storage dashboard and on-demand streaming engine powered directly by Telegram's MTProto API over WebSockets.

---

## 2. Technology Stack
- **Framework & Core:** React 18+ (Strict TypeScript 5), Vite 6
- **Styling:** Tailwind CSS v3.4 (Standard v3 config), `tailwindcss-animate`
- **UI Primitives:** Radix UI primitives (`shadcn/ui` aesthetic), `lucide-react`, `framer-motion`
- **Typography:** `Geist Sans` (UI copy) & `Geist Mono` (Telemetry, sizes, hashes, timestamps)
- **State Management:** Zustand 5 (Modular stores: `auth-store`, `drive-store`, `transfer-store`, `audio-player-store`)
- **Persistence:** IndexedDB (`idb-keyval`) for session strings, channel metadata, and file indexes
- **Telegram Engine:** `teleproto` npm package (`^1.233.0`, active maintained MTProto browser fork) over WebSocket (`ConnectionWebSocketObfuscated`)
- **Media & Streaming:** `@vidstack/react`, `mp4box.js` (ISO-BMFF demuxing), ServiceWorker (`/stream/:channelId/:messageId`), `pdfjs-dist`, `jszip`
- **Virtualization:** `@tanstack/react-virtual`
- **Hosting Target:** Cloudflare Pages (100% Static SPA)
- **License:** GNU Affero General Public License v3.0 (AGPLv3)

---

## 3. Architectural Constraints
- **Zero Backend:** All execution happens 100% client-side in the browser. Never introduce an intermediary server, proxy daemon, or external database.
- **Telegram as Media Engine:** Files and metadata are stored on Telegram channels/chats. No bot-token architecture is used—everything runs via user MTProto sessions.
- **MTProto Browser Compatibility:** Maintain browser-compatible imports and polyfills (`Buffer`, `crypto`, `stream`). Never import raw Node.js runtime bindings (`net`, `tls`, `fs`).

---

## 4. Security & Safety Rules
- **No Unsafe Execution:** No `eval()`, `Function()`, or `dangerouslySetInnerHTML`.
- **Media Preview Sandboxing:** Untrusted SVG, HTML, or code previews must be rendered in sandboxed iframes or isolated text components.
- **Blob Lifecycle Management:** Always revoke generated Blob URLs with `URL.revokeObjectURL(url)` in a `finally` block or delayed cleanup window (10s) to prevent memory leaks.
- **Memory Safety:** Avoid monolithic `ArrayBuffer` allocations for gigabyte-scale files. Use bounded chunk streaming (`512 KB` MTProto chunks).
- **Strict Content Security Policy:** Preserve headers and security isolation required for Cloudflare Pages (`public/_headers`).

---

## 5. Development & Git Guardrails
- **Localhost Only:** Run and test exclusively on `http://localhost:5173/`.
- **CRITICAL GIT RULE:** **NEVER execute `git commit`, `git push`, or trigger CI/CD autonomously** unless the user explicitly requests it with exact command syntax in prompt text.
- **Commit Author:** When committing under user request, ensure the git author is `xrnix <237821263+xrnix@users.noreply.github.com>`.

---

## 6. Physical Craftsmanship & Brand System
- **Brand Mark:** Official monochrome stealth origami delta logo (`<VaultgramLogo />` in `src/components/ui/vaultgram-logo.tsx`, `public/logo.png`, `public/favicon.svg`).
- **Surfaces & Depth:** Deep anodized brushed obsidian gradients (`linear-gradient(180deg, #131317 0%, #0d0d10 100%)`) with a 1px micro-milled top bevel highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.12)`).
- **Recessed Insets:** Deep dark matte instrument wells (`#08080a`, `inset 0 1.5px 3px rgba(0, 0, 0, 0.9)`).
- **Borders & Radii:** Hairline borders (`border-white/[0.08]`). Micro-radii strictly (`rounded-sm` [2px] to `rounded-md` [6px] max). Never use bubble/toy `rounded-2xl` or `rounded-3xl` corners.
- **Status Indicators:** Avoid garish AI candy-colored pill badges. Use precision **Optical Hardware Indicators**: inset dark badge with a 1.5px luminous emerald/carmine LED pin-dot and tracked uppercase mono text.
- **Accent Hierarchy:** High-contrast 24K Auric Champagne (`#e8d5b5` / `#c5a059`) for primary action anchors (Upload CTA) and archival file classification stamps.

---

## 7. Engineering Standards
- **Strict Typing:** Never use `any` to silence TypeScript errors. Use narrow types, interfaces, or adapter mappers.
- **Verified APIs:** Check installed library versions (`node_modules/`) rather than guessing APIs.
- **Accurate Lifecycles:** Distinguish network completion from browser completion (e.g. MTProto transfer complete vs `link.click()` browser download trigger).
- **Resilience:** Handle `FLOOD_WAIT_X`, cancellations (`AbortController`), `FILE_REFERENCE_EXPIRED`, and cross-DC authorization migrations (`auth.exportAuthorization` / `auth.importAuthorization`) gracefully.

---

## 8. AI Context & Operating Policy
- **Context is a scarce engineering resource:** Prefer retrieving 5 relevant files over dumping 100 irrelevant files. Prefer repository state over conversation history. Prefer summaries for historical information and exact source text for code that will be modified.
- **Reading Order for New Sessions:**
  1. Read `AGENTS.md` (this file).
  2. Read `CURRENT_STATE.md` for active milestones and verification state.
  3. Read `ARCHITECTURE.md` when working across subsystems.
  4. Read `DECISIONS.md` before making architectural changes.
- **Source of Truth:** Treat source code as the implementation truth.
- **Targeted Retrieval:** Use symbol searches and targeted `grep` calls instead of loading entire directories.
- **Maintenance:** Update `CURRENT_STATE.md` after major milestones; add an ADR to `DECISIONS.md` when durable architectural decisions are made.
