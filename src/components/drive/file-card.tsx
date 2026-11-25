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
            whileHover={{ y: -1 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`${file.name} — ${token.label}, ${formatBytes(file.size)}`}
            data-selected={isSelected ? "true" : undefined}
            className={cn(
              "group relative flex h-[124px] cursor-pointer select-none flex-col overflow-hidden rounded-[5px] border p-3.5",
              "transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.995]",
              isSelected
                ? "border-[#e8d5b5]/40 bg-[#16140f] hover:border-[#e8d5b5]/55 hover:bg-[#191610]"
                : "border-white/[0.055] bg-[#0f0f12] hover:border-white/[0.13] hover:bg-[#141418]"
            )}
          >
            {/* Top: media class + extension, then quiet actions */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <MediaGlyph category={file.category} className="h-[17px] w-[17px]" strokeWidth={1.5} />
                <span className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-zinc-500 transition-colors group-hover:text-zinc-500 truncate">
                  {getFileExtension()}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {isSelected && (
                  <motion.span
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
                    className="flex h-4 w-4 items-center justify-center rounded-[2px] bg-[#e8d5b5] text-[#17130b]"
                  >
                    <Check className="h-2.5 w-2.5 stroke-[3px]" />
                  </motion.span>
                )}

                {isPinned && <Pin className="h-3 w-3 shrink-0 fill-zinc-500 text-zinc-500" />}
                {isFavorite && <Star className="h-3 w-3 shrink-0 fill-[#c5a059] text-[#c5a059]" />}

                {/* Desktop 1-click download */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(file);
                  }}
                  tabIndex={-1}
                  className="hidden sm:flex h-6 w-6 items-center justify-center rounded-[3px] text-zinc-600 opacity-0 transition-colors hover:bg-white/[0.06] hover:text-white group-hover:opacity-100"
                  title="Download file"
                >
                  <Download className="h-3 w-3 stroke-[1.6px]" />
                </button>

                {/* Touch / Quick Actions Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-9 w-9 -mr-2 -mt-1.5 items-center justify-center rounded-[4px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white sm:m-0 sm:h-6 sm:w-6 sm:rounded-[3px] sm:opacity-0 group-hover:sm:opacity-100"
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

            {/* Name — the only thing that gets two lines */}
            <div className="mt-4 flex-1">
              <span
                className="line-clamp-2 break-words text-[12.5px] font-medium leading-[1.4] tracking-[-0.005em] text-zinc-300 transition-colors group-hover:text-white"
                title={file.name}
              >
                {file.name}
              </span>
            </div>

            {/* Meta — mono, tabular, deliberately quiet */}
            <div className="num mt-2 flex items-baseline justify-between gap-2 font-mono text-[10px] text-zinc-500">
              <span className="truncate">{formatBytes(file.size)}</span>
              <span className="shrink-0">{formatDate(file.date)}</span>
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
