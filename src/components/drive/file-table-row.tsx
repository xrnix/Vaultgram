import React from "react";
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

interface FileTableRowProps {
  file: DriveFile;
  onDownload: (file: DriveFile) => void;
}

export const FileTableRow = React.memo<FileTableRowProps>(
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
          <div
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            aria-label={`${file.name} — ${token.label}, ${formatBytes(file.size)}`}
            data-selected={isSelected ? "true" : undefined}
            className={cn(
              "group relative flex h-full w-full cursor-pointer select-none items-center border-b border-white/[0.035] px-2.5 text-xs transition-colors hover:bg-white/[0.025] active:bg-white/[0.04] sm:px-3",
              isSelected && "bg-[#e8d5b5]/[0.045] hover:bg-[#e8d5b5]/[0.06]"
            )}
          >
            {isSelected && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-[1.5px] bg-[#e8d5b5]/70"
              />
            )}

            {/* Name & Icon (2-line stacked metadata on mobile) */}
            <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden pr-2 sm:pr-4">
              <MediaGlyph category={file.category} className="h-[15px] w-[15px]" strokeWidth={1.5} />
              {isSelected && (
                <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] bg-[#e8d5b5] text-[#17130b]">
                  <Check className="h-2 w-2 stroke-[3px]" />
                </span>
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="truncate text-[12.5px] font-medium tracking-[-0.005em] text-zinc-300 transition-colors group-hover:text-white"
                    title={file.name}
                  >
                    {file.name}
                  </span>
                  {isPinned && <Pin className="h-2.5 w-2.5 shrink-0 fill-zinc-500 text-zinc-500" />}
                  {isFavorite && <Star className="h-2.5 w-2.5 shrink-0 fill-[#c5a059] text-[#c5a059]" />}
                </div>
                <div className="num mt-0.5 flex items-center gap-1.5 truncate font-mono text-[10px] text-zinc-500 sm:hidden">
                  <span>{formatBytes(file.size)}</span>
                  <span className="text-zinc-700">/</span>
                  <span>{formatDate(file.date)}</span>
                  <span className="text-zinc-700">/</span>
                  <span className="truncate">{file.channelTitle}</span>
                </div>
              </div>
            </div>

            {/* Channel Source (hidden on mobile) */}
            <div className="hidden w-28 shrink-0 truncate px-2 font-mono text-[11px] text-zinc-500 sm:block sm:w-36">
              {file.channelTitle}
            </div>

            {/* Category (hidden on mobile/tablet) */}
            <div className="hidden w-20 shrink-0 px-2 font-mono text-[9px] font-medium uppercase tracking-[0.14em] md:block sm:w-24">
              <span style={{ color: token.hue }}>{file.category}</span>
            </div>

            {/* Size (desktop column; mobile shows size inline under filename) */}
            <div className="num hidden w-24 shrink-0 px-2 font-mono text-[11px] text-zinc-400 sm:block">
              {formatBytes(file.size)}
            </div>

            {/* Date (hidden on mobile) */}
            <div className="num hidden w-20 shrink-0 px-2 font-mono text-[11px] text-zinc-500 sm:block sm:w-28">
              {formatDate(file.date)}
            </div>

            {/* Actions: Desktop hover buttons + Touch dropdown trigger */}
            <div className="w-10 sm:w-12 shrink-0 flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(file);
                }}
                className="hidden sm:flex h-6 w-6 rounded-[3px] items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] opacity-0 group-hover:opacity-100 transition-opacity"
                title="Download"
              >
                <Download className="h-3 w-3 stroke-[1.5px]" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-10 w-10 sm:h-6 sm:w-6 items-center justify-center rounded-[4px] sm:rounded-[3px] text-zinc-400 hover:text-white hover:bg-white/[0.08] sm:opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="More options"
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
        </ContextMenuTrigger>

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
            <span>{isFavorite ? "Remove Favorite" : "Add to Favorites"}</span>
          </ContextMenuItem>

          <ContextMenuSeparator className="bg-white/[0.08]" />

          <ContextMenuItem onClick={copyTelegramReference} className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white">
            <Copy className="h-3.5 w-3.5 stroke-[1.5px]" />
            <span>Copy Telegram Message Ref</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
  (prev, next) =>
    prev.file.id === next.file.id &&
    prev.file.size === next.file.size &&
    prev.file.date === next.file.date &&
    prev.file.name === next.file.name
);
