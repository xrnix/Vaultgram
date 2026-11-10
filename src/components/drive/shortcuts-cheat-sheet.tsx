import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Command, Keyboard } from "lucide-react";

interface ShortcutsCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  items: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Global & Navigation",
    items: [
      { keys: ["⌘", "K"], description: "Open Command Palette" },
      { keys: ["U"], description: "Trigger file upload to active vault" },
      { keys: ["?"], description: "Open Shortcuts Cheat Sheet" },
      { keys: ["⌘", "A"], description: "Select all files in active view" },
      { keys: ["Esc"], description: "Dismiss modal or clear active selection" },
    ],
  },
  {
    title: "File Operations",
    items: [
      { keys: ["Space"], description: "Quick preview selected document or media" },
      { keys: ["I"], description: "Inspect file metadata & MTProto telemetry" },
      { keys: ["S"], description: "Shareable link & QR code generator" },
      { keys: ["P"], description: "Toggle pin on selected file" },
      { keys: ["D"], description: "Queue high-speed MTProto download" },
    ],
  },
  {
    title: "Video & Audio Players",
    items: [
      { keys: ["Space", "K"], description: "Toggle playback" },
      { keys: ["J", "L"], description: "Seek -10s / +10s" },
      { keys: [",", "."], description: "Step backward / forward one frame" },
      { keys: ["F"], description: "Toggle full-screen cinema mode" },
      { keys: ["M"], description: "Mute or unmute audio stream" },
      { keys: ["0-9"], description: "Jump directly to 0% – 90% timeline" },
    ],
  },
  {
    title: "Image Studio Lightbox",
    items: [
      { keys: ["←", "→"], description: "Navigate adjacent images in folder" },
      { keys: ["+", "-"], description: "Zoom in / Zoom out" },
      { keys: ["R"], description: "Rotate image 90° clockwise" },
      { keys: ["F"], description: "Flip image horizontally" },
      { keys: ["0"], description: "Reset transforms and zoom scale" },
    ],
  },
];

export const ShortcutsCheatSheetModal: React.FC<ShortcutsCheatSheetModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto no-scrollbar border-white/[0.1] bg-[#121215] text-zinc-200 p-6 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl rounded-[8px]">
        {/* Top Hairline Sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        <DialogHeader className="space-y-2 pb-3">
          <div className="flex items-center gap-3 text-white font-sans text-base font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white/[0.04] border border-white/[0.08] text-[#e6cfa3]">
              <Keyboard className="h-4.5 w-4.5 stroke-[1.5px]" />
            </div>
            <DialogTitle className="text-base font-sans tracking-tight text-white">
              Keyboard Shortcuts
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400 leading-relaxed font-sans">
            Streamline your workflow with precision keyboard commands across Vaultgram.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 px-0.5">
                {group.title}
              </h3>
              <div className="rounded-[6px] border border-white/[0.07] bg-[#09090b] divide-y divide-white/[0.04] overflow-hidden">
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-zinc-300 font-sans">{item.description}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="min-w-[22px] px-2 py-0.5 text-center font-mono text-[10px] bg-white/[0.06] border border-white/[0.12] text-zinc-200 rounded-[4px] shadow-sm font-medium"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
            <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
              <Command className="h-3.5 w-3.5" />
              Press <kbd className="px-1.5 py-0.5 text-[10px] bg-white/[0.06] rounded-[3px] border border-white/[0.1] text-zinc-300">?</kbd> anywhere to toggle
            </span>
            <Button
              type="button"
              size="sm"
              onClick={onClose}
              className="h-8.5 px-4 text-xs bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.16] rounded-[6px]"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default ShortcutsCheatSheetModal;
