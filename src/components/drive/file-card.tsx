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
    const togglePin = useDriveStore((s) => s.togglePin);
    const toggleFavorite = useDriveStore((s) => s.toggleFavorite);
    const setPreviewFile = useDriveStore((s) => s.setPreviewFile);

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
          return <Image className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-300 stroke-[1.5px]" />;
        case "VIDEO":
          return <Video className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-300 stroke-[1.5px]" />;
        case "DOC":
          return <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-300 stroke-[1.5px]" />;
        case "ARCHIVE":
          return <Archive className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-300 stroke-[1.5px]" />;
        case "AUDIO":
          return <Music className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-300 stroke-[1.5px]" />;
        default:
          return <File className="h-4 w-4 sm:h-5 sm:w-5 text-zinc-300 stroke-[1.5px]" />;
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
          <motion.div
            whileHover={{ y: -2, transition: { type: "spring", stiffness: 400, damping: 25 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPreviewFile(file)}
            className={cn(
              "group relative flex flex-col justify-between rounded-[5px] border border-white/[0.07] bg-[#0c0e14]/60 p-2.5 sm:p-3 transition-colors hover:bg-[#0f121a]/85 hover:border-white/[0.18] cursor-pointer select-none h-[138px] sm:h-[142px] overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.7),0_0_15px_rgba(255,255,255,0.02)]",
              "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.14] before:to-transparent",
              isPinned && "border-white/[0.18] bg-[#0f121a]/90"
            )}
          >
            {/* Top: Icon + Extension Badge + Indicators + Options */}
            <div className="flex items-start justify-between gap-1">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-[4px] bg-white/[0.03] border border-white/[0.08] group-hover:border-white/[0.18] group-hover:bg-white/[0.06] transition-colors shrink-0">
                {getFileIcon()}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Micro Extension Badge */}
                <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-400 bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded-[3px]">
                  {getFileExtension()}
                </span>

                {isPinned && <Pin className="h-3 w-3 text-cyan-400 fill-cyan-400 shrink-0" />}
                {isFavorite && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}

                {/* Touch / Quick Actions Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-6 w-6 items-center justify-center rounded-[3px] text-zinc-500 hover:text-white hover:bg-white/[0.08] opacity-80 group-hover:opacity-100 transition-opacity"
                      aria-label="File options"
                    >
                      <MoreVertical className="h-3.5 w-3.5 stroke-[1.5px]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-[#0c0e14] border-white/[0.1] text-zinc-300">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFile(file);
                      }}
                      className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white"
                    >
                      <Eye className="h-3.5 w-3.5 stroke-[1.5px]" />
                      <span>Quick Preview</span>
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
        <ContextMenuContent className="w-48 bg-[#0c0e14] border-white/[0.1] text-zinc-300">
          <ContextMenuItem onClick={() => setPreviewFile(file)} className="gap-2 text-xs hover:bg-white/[0.06] hover:text-white">
            <Eye className="h-3.5 w-3.5 stroke-[1.5px]" />
            <span>Quick Preview</span>
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
