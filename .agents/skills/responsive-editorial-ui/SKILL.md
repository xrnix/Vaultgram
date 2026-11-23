---
name: responsive-editorial-ui
description: UI/UX design standards for modern distraction-free editorial readers, floating command docks, touch ergonomics, and fluid reading canvases. Use when building long-form publication layouts, floating action docks, popovers, mobile sheets, and responsive typography.
---

# Responsive Editorial UI/UX Engineering

Directives for architecting world-class, distraction-free reading platforms and modern floating dock interfaces.

## 1. The Reading Canvas (Center Stage)
- **Optimal Line Length**: Measure width strictly between 65–75 characters per line (`max-w-2xl` to `max-w-3xl`, ~720px–840px). Never stretch long-form body copy across ultra-wide monitors.
- **Negative Space & Breathability**: Eliminate persistent sidebars flanking both sides of long-form essays. Use generous side margins so the reader feels focused and un-sandwiched.
- **Rhythm & Typographic Hierarchy**: Body copy line-height must stay relaxed (`leading-[1.75]` to `leading-[1.8]`). Headings must have proportional tracking and distinct weights.

## 2. Floating Command Dock (Arc / Notion / macOS style)
- **Positioning**: Fixed at bottom center (`bottom-6`) on desktop with subtle glassmorphic backdrop blur (`backdrop-blur-xl bg-[#090b10]/85 border border-white/10 shadow-2xl`).
- **Mobile Ergonomics**: On mobile devices, anchor comfortably in thumb reach with safe-area insets (`pb-[env(safe-area-inset-bottom)]`).
- **Touch Targets**: All dock buttons must have a minimum interactive tap target of `40x40px` (or `44x44px` on phones) with clear active micro-press scaling (`active:scale-95`).
- **Contextual Popovers**: Floating flyouts (TOC, display settings) should anchor directly above the dock with smooth spring-physics entrance (`origin-bottom`, `scale: 0.96` to `scale: 1`, `opacity: 0` to `opacity: 1`).
- **Dismissal & Click-Outside**: Clicking outside or pressing `Escape` must close active flyouts immediately without losing scroll position.

## 3. Navigation & Index Integration
- **Unify Directory & Search**: Avoid duplicate lists of articles across sidebars and modals. Provide one unified, blazing-fast Command Palette / Archive Switcher (⌘K).
- **Inline Table of Contents**: Provide an elegant, unobtrusive inline directory at the start of monographs, paired with a floating jump menu in the dock.
- **Keyboard Shortcuts**: `⌘K` for search, `Escape` to close modals, `J`/`K` or `[`/`]` for section or article navigation.
