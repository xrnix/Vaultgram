---
name: apple-design-engineering
description: Interaction and motion engineering modeled after Apple and Emil Kowalski design standards. Use this skill when implementing UI animations, gestures, micro-interactions, modal transitions, keyboard navigation traps, focus management, and fluid interruptible spring physics in web applications or components.
---

# Apple & Emil Kowalski Design Engineering (Interaction & Motion)

Specialized directives for high-fidelity micro-interactions, tactile feedback, and interruptible motion physics.

## Core Directives

### 1. Fluid Interruptible Springs
- **Physics over Durations**: Prefer spring physics (`stiffness`, `damping`, `mass`) over arbitrary cubic-bezier or linear duration animations.
- **Interruptibility**: Animations must never lock or drop frames if the user cancels or reverses the action mid-flight.
- **Micro-interactions**: Every interactive element must provide immediate visual confirmation on pointer-down/touch, not just on click release (e.g. scale transforms `scale(0.97)` on `:active`).

### 2. Layout Transitions & Gestures
- **Shared Layout Transitions**: When elements expand or shift (modals, drawers, list items), animate layout transitions seamlessly without layout pop or flicker (`framer-motion` layout animations or View Transitions API).
- **Spatial Consistency**: Elements must appear to originate from where they were triggered.
- **Drag & Dismiss Gestures**: Sheet and drawer modals should support rubber-banding, velocity-aware drag-to-dismiss, and spring snapping.

### 3. Bulletproof Keyboard & Focus Management
- **Keyboard Traps**: Modals, dropdowns, and overlays must trap Tab cycling strictly within their bounds.
- **Escape to Dismiss**: Every overlay, drawer, and tooltip must close predictably on `Escape`.
- **Focus Restoration**: When an overlay closes, focus must return immediately to the triggering element.
- **Visible Focus Rings**: Custom, beautiful `:focus-visible` outlines matching the design theme—never leave default ugly browser rings or strip outlines completely without replacement.
