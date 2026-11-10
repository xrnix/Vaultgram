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

interface FileCardProps {
  file: DriveFile;
  onDownload: (file: DriveFile) => void;
}

export const FileCard = React.memo<FileCardProps>(
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

    const getFileExtension = () => {
      const parts = file.name.split(".");
      if (parts.length > 1) {
        return parts.pop()?.toUpperCase().slice(0, 4) || file.category;
      }
      return file.category;
    };

    const getFileIcon = () => {
      switch (file.category) {
        case "IMAGE":
          return <Image className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-zinc-300 group-hover:text-zinc-100 stroke-[1.4px] transition-colors" />;
        case "VIDEO":
          return <Video className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-zinc-300 group-hover:text-zinc-100 stroke-[1.4px] transition-colors" />;
        case "DOC":
          return <FileText className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-zinc-300 group-hover:text-zinc-100 stroke-[1.4px] transition-colors" />;
        case "ARCHIVE":
          return <Archive className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-zinc-300 group-hover:text-zinc-100 stroke-[1.4px] transition-colors" />;
        case "AUDIO":
          return <Music className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-[#e6cfa3] group-hover:text-white stroke-[1.4px] transition-colors" />;
        default:
          return <File className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-zinc-300 group-hover:text-zinc-100 stroke-[1.4px] transition-colors" />;
      }
    };

    const copyTelegramReference = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const text = `Channel: ${file.channelTitle} (ID: ${file.channelId}), Msg: ${file.messageId}`;
      navigator.clipboard.writeText(text);
      toast.success("Telegram message reference copied to clipboard");
    };

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

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <motion.div
            whileHover={{ y: -2, transition: { type: "spring", stiffness: 450, damping: 28 } }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClick}
            className={cn(
              "specimen-card hairline-sheen group relative flex flex-col justify-between rounded-[5px] p-3 transition-all duration-200 cursor-pointer select-none h-[140px] overflow-hidden",
              isPinned && "border-white/[0.2] bg-[#141418]",
              isSelected && "border-white/50 bg-[#17171e] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_24px_rgba(255,255,255,0.05)]"
            )}
          >
            {/* Top: Machined Pocket + Specimen Extension Stamp + Options */}
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <div className="specimen-inset flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-[4px] shrink-0">
                  {getFileIcon()}
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
                <span className="font-mono text-[9px] font-semibold tracking-[0.16em] uppercase text-zinc-400 bg-white/[0.03] border border-white/[0.08] px-1.5 py-0.5 rounded-[3px] group-hover:border-white/[0.14] group-hover:text-zinc-200 transition-colors">
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
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-6 w-6 items-center justify-center rounded-[3px] text-zinc-500 hover:text-white hover:bg-white/[0.08] sm:opacity-60 group-hover:opacity-100 transition-opacity"
                      aria-label="File options"
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

            {/* Middle: File Name */}
            <div className="my-auto py-1">
              <span
                className="line-clamp-2 text-xs font-medium leading-snug text-zinc-200 group-hover:text-white break-words font-sans"
                title={file.name}
              >
                {file.name}
              </span>
            </div>

            {/* Bottom: Meta Bar with Tabular Numerals */}
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-1.5 sm:pt-2 font-mono text-[10px] text-zinc-500 tabular-nums">
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
