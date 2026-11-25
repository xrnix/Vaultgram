import React from "react";
import { motion } from "framer-motion";
import { DriveFile } from "@/lib/telegram/indexer";
import { useDriveStore } from "@/lib/stores/drive-store";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Eye,
  Pin,
  Star,
  Copy,
  MoreVertical,
  Info,
  Share2,
  Check,
} from "lucide-react";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { MEDIA_TOKENS } from "@/lib/media-tokens";
import { MediaGlyph } from "./media-glyph";
import { toast } from "sonner";

interface FileCardProps {
  file: DriveFile;
  onDownload: (file: DriveFile) => void;
}

export const FileCard = React.memo<FileCardProps>(
  ({ file, onDownload }) => {
    const isPinned = useDriveStore((s) => s.pinnedFileIds.has(file.id));
    const isFavorite = useDriveStore((s) => s.favoriteFileIds.has(file.id));
    const isSelected = useDriveStore((s) => s.selectedFileIds.has(file.id));
    const hasSelection = useDriveStore((s) => s.selectedFileIds.size > 0);
    const toggleSelectFile = useDriveStore((s) => s.toggleSelectFile);
    const togglePin = useDriveStore((s) => s.togglePin);
    const toggleFavorite = useDriveStore((s) => s.toggleFavorite);
    const setPreviewFile = useDriveStore((s) => s.setPreviewFile);
    const setDetailsFile = useDriveStore((s) => s.setDetailsFile);
    const setShareFile = useDriveStore((s) => s.setShareFile);
    const setTextViewerFile = useDriveStore((s) => s.setTextViewerFile);
    const setCopyToVaultFiles = useDriveStore((s) => s.setCopyToVaultFiles);

    const isCodeOrText =
      file.category === "DOC" &&
      !!file.name.toLowerCase().match(/\.(txt|md|json|js|ts|tsx|jsx|html|css|py|rs|go|sh|yml|yaml|xml|csv|log|env)$/);

    const token = MEDIA_TOKENS[file.category] ?? MEDIA_TOKENS.OTHER;

    const getFileExtension = () => {
      const parts = file.name.split(".");
      if (parts.length > 1) {
        return parts.pop()?.toUpperCase().slice(0, 4) || file.category;
      }
      return file.category;
    };

    const copyTelegramReference = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const text = `Channel: ${file.channelTitle} (ID: ${file.channelId}), Msg: ${file.messageId}`;
      navigator.clipboard.writeText(text);
      toast.success("Telegram message reference copied to clipboard");
    };

    const openFile = () => {
      if (isCodeOrText) {
        setTextViewerFile(file);
      } else {
        setPreviewFile(file);
      }
    };

    const handleClick = (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || hasSelection) {
        e.preventDefault();
        toggleSelectFile(file.id);
      } else {
        openFile();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        if (e.metaKey || e.ctrlKey || e.shiftKey) {
          toggleSelectFile(file.id);
        } else {
          openFile();
        }
      }
    };

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            whileHover={{ y: -2, transition: { type: "spring", stiffness: 450, damping: 28 } }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`${file.name} — ${token.label}, ${formatBytes(file.size)}`}
            data-selected={isSelected ? "true" : undefined}
            className={cn(
              "specimen-card hairline-sheen group relative flex flex-col justify-between rounded-[5px] p-3 transition-all duration-200 cursor-pointer select-none h-[140px] overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:ring-inset",
              isPinned && "border-white/[0.2] bg-[#141418]",
              isSelected && "border-white/50 bg-[#17171e] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_24px_rgba(255,255,255,0.05)]"
            )}
          >
            {/* Semantic category bloom — reveals the media class at a glance */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-80"
              style={{ backgroundImage: token.bloom }}
            />

            {/* Machined optical spine keyed to the media class */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-3.5 left-0 w-[2px] rounded-r-[1px] opacity-50 transition-opacity duration-200 group-hover:opacity-90"
              style={{ backgroundImage: `linear-gradient(180deg, ${token.hue}, transparent)` }}
            />

            {/* Top: Machined Pocket + Specimen Extension Stamp + Options */}
            <div className="relative flex items-start justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <div
                  className="specimen-inset flex h-8 w-8 items-center justify-center rounded-[4px] shrink-0"
                  style={{ backgroundColor: token.wash, borderColor: token.line }}
                >
                  <MediaGlyph category={file.category} className="h-4 w-4" />
                </div>
                {isSelected && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="flex h-4 w-4 items-center justify-center rounded-[2px] bg-white text-black shadow-sm"
                  >
                    <Check className="h-2.5 w-2.5 stroke-[3px]" />
                  </motion.span>
                )}
              </div>

              <div className="flex items-center gap-1 sm:gap-1.5">
                {/* Precision Archival Extension Stamp */}
                <span
                  className="font-mono text-[9px] font-semibold tracking-[0.16em] uppercase px-1.5 py-0.5 rounded-[3px] border transition-colors"
                  style={{
                    color: token.hue,
                    backgroundColor: token.wash,
                    borderColor: token.line,
                  }}
                >
                  {getFileExtension()}
                </span>

                {isPinned && <Pin className="h-3 w-3 text-zinc-300 fill-zinc-300 shrink-0" />}
                {isFavorite && <Star className="h-3 w-3 text-[#c49b56] fill-[#c49b56] shrink-0" />}

                {/* Desktop 1-Click Download Quick Action */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(file);
                  }}
                  className="hidden sm:flex h-6 w-6 items-center justify-center rounded-[3px] tactile-keycap text-zinc-400 hover:text-white transition-all duration-150 opacity-0 group-hover:opacity-100"
                  title="Download File"
                >
                  <Download className="h-3 w-3 stroke-[1.6px]" />
                </button>

                {/* Touch / Quick Actions Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-9 w-9 -mr-2 -mt-1.5 sm:h-6 sm:w-6 sm:m-0 items-center justify-center rounded-[4px] sm:rounded-[3px] text-zinc-400 sm:text-zinc-500 hover:text-white hover:bg-white/[0.08] sm:opacity-60 group-hover:opacity-100 transition-opacity"
                      aria-label="File options"
                    >
                      <MoreVertical className="h-4 w-4 sm:h-3.5 sm:w-3.5 stroke-[1.5px]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-[#121215] border-white/[0.1] text-zinc-300">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectFile(file.id);
                      }}
                      className="gap-2 py-2 sm:py-1.5 text-xs hover:bg-white/[0.06] hover:text-white"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[1.75px]" />
                      <span>{isSelected ? "Deselect Item" : "Select Item"}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCodeOrText) setTextViewerFile(file);
                        else setPreviewFile(file);
                      }}
                      className="gap-2 py-2 sm:py-1.5 text-xs hover:bg-white/[0.06] hover:text-white"
                    >
                      <Eye className="h-3.5 w-3.5 stroke-[1.5px]" />
                      <span>{isCodeOrText ? "View Code / Text" : "Quick Preview"}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailsFile(file);
                      }}
                      className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white"
                    >
                      <Info className="h-3.5 w-3.5 stroke-[1.5px]" />
                      <span>File Inspector</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareFile(file);
                      }}
                      className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white"
                    >
                      <Share2 className="h-3.5 w-3.5 stroke-[1.5px]" />
                      <span>Share Link &amp; QR</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setCopyToVaultFiles([file]);
                      }}
                      className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5 stroke-[1.5px] text-[#c49b56]" />
                      <span>Clone to Vault</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(file);
                      }}
                      className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5 stroke-[1.5px]" />
                      <span>Download</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-white/[0.08]" />

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(file.id);
                      }}
                      className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white"
                    >
                      <Pin className="h-3.5 w-3.5 stroke-[1.5px]" />
                      <span>{isPinned ? "Unpin File" : "Pin File"}</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(file.id);
                      }}
                      className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white"
                    >
                      <Star className="h-3.5 w-3.5 stroke-[1.5px]" />
                      <span>{isFavorite ? "Remove Favorite" : "Favorite"}</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-white/[0.08]" />

                    <DropdownMenuItem onClick={copyTelegramReference} className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white">
                      <Copy className="h-3.5 w-3.5 stroke-[1.5px]" />
                      <span>Copy Telegram Ref</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Middle: File Name */}
            <div className="relative my-auto py-1">
              <span
                className="line-clamp-2 text-xs font-medium leading-snug text-zinc-200 group-hover:text-white break-words font-sans"
                title={file.name}
              >
                {file.name}
              </span>
            </div>

            {/* Bottom: Meta Bar with Tabular Numerals */}
            <div className="relative flex items-center justify-between border-t border-white/[0.06] pt-1.5 sm:pt-2 font-mono text-[10px] text-zinc-500 tabular-nums">
              <span>{formatBytes(file.size)}</span>
              <span className="truncate ml-1">{formatDate(file.date)}</span>
            </div>
          </motion.div>
        </ContextMenuTrigger>

        {/* Right Click Context Menu */}
        <ContextMenuContent className="w-52 bg-[#121215] border-white/[0.1] text-zinc-300">
          <ContextMenuItem
            onClick={() => {
              if (isCodeOrText) setTextViewerFile(file);
              else setPreviewFile(file);
            }}
            className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white"
          >
            <Eye className="h-3.5 w-3.5 stroke-[1.5px]" />
            <span>{isCodeOrText ? "View Code / Text" : "Quick Preview"}</span>
          </ContextMenuItem>

          <ContextMenuItem onClick={() => setDetailsFile(file)} className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white">
            <Info className="h-3.5 w-3.5 stroke-[1.5px]" />
            <span>File Inspector</span>
          </ContextMenuItem>

          <ContextMenuItem onClick={() => setShareFile(file)} className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white">
            <Share2 className="h-3.5 w-3.5 stroke-[1.5px]" />
            <span>Share Link &amp; QR</span>
          </ContextMenuItem>

          <ContextMenuItem onClick={() => setCopyToVaultFiles([file])} className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white">
            <Copy className="h-3.5 w-3.5 stroke-[1.5px] text-[#c49b56]" />
            <span>Clone to Vault</span>
          </ContextMenuItem>

          <ContextMenuItem onClick={() => onDownload(file)} className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white">
            <Download className="h-3.5 w-3.5 stroke-[1.5px]" />
            <span>Download</span>
          </ContextMenuItem>

          <ContextMenuSeparator className="bg-white/[0.08]" />

          <ContextMenuItem onClick={() => togglePin(file.id)} className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white">
            <Pin className="h-3.5 w-3.5 stroke-[1.5px]" />
            <span>{isPinned ? "Unpin File" : "Pin File"}</span>
          </ContextMenuItem>

          <ContextMenuItem onClick={() => toggleFavorite(file.id)} className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white">
            <Star className="h-3.5 w-3.5 stroke-[1.5px]" />
            <span>{isFavorite ? "Remove from Favorites" : "Add to Favorites"}</span>
          </ContextMenuItem>

          <ContextMenuSeparator className="bg-white/[0.08]" />

          <ContextMenuItem onClick={copyTelegramReference} className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white">
            <Copy className="h-3.5 w-3.5 stroke-[1.5px]" />
            <span>Copy Telegram Message Ref</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }
);
