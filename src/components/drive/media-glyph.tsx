import React from "react";
import { Archive, File, FileText, Image, Music, Video, type LucideIcon } from "lucide-react";
import type { FileCategory } from "@/lib/telegram/indexer";
import { MEDIA_TOKENS } from "@/lib/media-tokens";
import { cn } from "@/lib/utils";

const GLYPHS: Record<FileCategory, LucideIcon> = {
  IMAGE: Image,
  VIDEO: Video,
  AUDIO: Music,
  DOC: FileText,
  ARCHIVE: Archive,
  OTHER: File,
};

interface MediaGlyphProps {
  category: FileCategory;
  className?: string;
  strokeWidth?: number;
  /** Optional secondary mark rendered at half opacity behind the glyph. */
  muted?: boolean;
}

/**
 * Category glyph rendered in its semantic hue. Purely decorative — the
 * accessible name always comes from the surrounding row/card.
 */
export const MediaGlyph: React.FC<MediaGlyphProps> = ({
  category,
  className = "h-4 w-4",
  strokeWidth = 1.4,
  muted = false,
}) => {
  const Glyph = GLYPHS[category] ?? File;
  const token = MEDIA_TOKENS[category] ?? MEDIA_TOKENS.OTHER;

  return (
    <Glyph
      aria-hidden="true"
      strokeWidth={strokeWidth}
      className={cn("shrink-0 transition-opacity duration-150", className)}
      style={{ color: token.hue, opacity: muted ? 0.72 : 1 }}
    />
  );
};
