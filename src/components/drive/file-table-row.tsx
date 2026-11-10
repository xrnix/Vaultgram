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
  Image,
  Video,
  FileText,
  Archive,
  Music,
  File,
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

    const handleClick = (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
        e.preventDefault();
        toggleSelectFile(file.id);
      } else {
        if (isCodeOrText) {
          setTextViewerFile(file);
        } else {
          setPreviewFile(file);
        }
      }
    };

    const getFileIcon = () => {
      switch (file.category) {
        case "IMAGE":
          return <Image className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200 stroke-[1.4px] transition-colors" />;
        case "VIDEO":
          return <Video className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200 stroke-[1.4px] transition-colors" />;
        case "DOC":
          return <FileText className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200 stroke-[1.4px] transition-colors" />;
        case "ARCHIVE":
          return <Archive className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200 stroke-[1.4px] transition-colors" />;
        case "AUDIO":
          return <Music className="h-3.5 w-3.5 text-[#e6cfa3] group-hover:text-white stroke-[1.4px] transition-colors" />;
        default:
          return <File className="h-3.5 w-3.5 text-zinc-400 group-hover:text-zinc-200 stroke-[1.4px] transition-colors" />;
      }
    };

    const copyTelegramReference = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const text = `Channel: ${file.channelTitle} (ID: ${file.channelId}), Msg: ${file.messageId}`;
      navigator.clipboard.writeText(text);
      toast.success("Telegram message reference copied to clipboard");
    };

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            onClick={handleClick}
            className={cn(
              "group flex h-11 w-full items-center border-b border-white/[0.04] hover:bg-white/[0.03] text-xs transition-colors cursor-pointer select-none px-2 sm:px-3 active:bg-white/[0.05]",
              isSelected && "bg-white/[0.06] border-white/20"
            )}
          >
            {/* Name & Icon */}
            <div className="flex items-center gap-2 sm:gap-2.5 overflow-hidden flex-1 min-w-0 pr-2 sm:pr-4">
              <div className="specimen-inset flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] transition-colors">
                {getFileIcon()}
              </div>
              {isSelected && (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-[2px] bg-white text-black shrink-0">
                  <Check className="h-2.5 w-2.5 stroke-[3px]" />
                </span>
              )}
              <span
                className="truncate font-medium text-zinc-200 group-hover:text-white font-sans tracking-tight"
                title={file.name}
              >
                {file.name}
              </span>
              {isPinned && <Pin className="h-2.5 w-2.5 text-zinc-300 fill-zinc-300 shrink-0" />}
              {isFavorite && <Star className="h-2.5 w-2.5 text-[#c49b56] fill-[#c49b56] shrink-0" />}
            </div>

            {/* Channel Source (hidden on mobile) */}
            <div className="w-28 sm:w-36 shrink-0 text-zinc-500 truncate px-2 hidden sm:block font-mono text-[11px]">
              {file.channelTitle}
            </div>

            {/* Category Badge (hidden on mobile/tablet) */}
            <div className="w-20 sm:w-24 shrink-0 font-mono text-[9px] font-semibold tracking-[0.14em] uppercase text-zinc-400 px-2 hidden md:block">
              <span className="rounded-[3px] bg-white/[0.03] border border-white/[0.08] px-1.5 py-0.5">
                {file.category}
              </span>
            </div>

            {/* Size */}
            <div className="w-16 sm:w-24 shrink-0 font-mono text-[11px] text-zinc-300 px-1.5 sm:px-2 text-right sm:text-left tabular-nums">
              {formatBytes(file.size)}
            </div>

            {/* Date (hidden on mobile) */}
            <div className="w-20 sm:w-28 shrink-0 font-mono text-[11px] text-zinc-500 px-2 hidden sm:block tabular-nums">
              {formatDate(file.date)}
            </div>

            {/* Actions: Desktop hover buttons + Touch dropdown trigger */}
            <div className="w-9 sm:w-12 shrink-0 flex items-center justify-end gap-1">
              <button
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
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-7.5 w-7.5 sm:h-6 sm:w-6 items-center justify-center rounded-[3px] text-zinc-400 hover:text-white hover:bg-white/[0.08] sm:opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-3.5 w-3.5 stroke-[1.5px]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-[#121215] border-white/[0.1] text-zinc-300">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCodeOrText) setTextViewerFile(file);
                      else setPreviewFile(file);
                    }}
                    className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white"
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
