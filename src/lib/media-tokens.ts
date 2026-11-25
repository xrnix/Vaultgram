import type { FileCategory } from "./telegram/indexer";

/**
 * Semantic media tokens.
 *
 * One source of truth for how a file class is signalled across the drive:
 * icon wells, archival extension stamps, sidebar indices, breadcrumbs, and
 * mobile category strips all read from here.
 *
 * Colour discipline (see AGENTS.md §6): the saturated `hue` is reserved for
 * 1px-class strokes and mono glyphs. Surfaces only ever receive `wash`
 * (10% alpha) and `line` (26% alpha), so everything reads as a precision
 * indicator rather than a candy pill.
 */
export interface MediaToken {
  /** Human label used in breadcrumbs, chips, and inspector rows. */
  label: string;
  /** Saturated hue — icon strokes, stamps, accent spines. */
  hue: string;
  /** Recessed well fill. Always low alpha. */
  wash: string;
  /** Hairline framing the wash. */
  line: string;
  /** Faint corner gradient for card depth. */
  bloom: string;
}

const build = (label: string, hue: string, rgb: string): MediaToken => ({
  label,
  hue,
  wash: `rgba(${rgb}, 0.10)`,
  line: `rgba(${rgb}, 0.26)`,
  bloom: `radial-gradient(130% 100% at 100% 0%, rgba(${rgb}, 0.09), transparent 62%)`,
});

export const MEDIA_TOKENS: Record<FileCategory, MediaToken> = {
  IMAGE: build("Image", "#34d399", "52, 211, 153"),
  VIDEO: build("Video", "#38bdf8", "56, 189, 248"),
  AUDIO: build("Audio", "#e0b070", "224, 176, 112"),
  DOC: build("Document", "#93c5fd", "147, 197, 253"),
  ARCHIVE: build("Archive", "#fb923c", "251, 146, 60"),
  OTHER: build("File", "#a1a1aa", "161, 161, 170"),
};

/** Non-category landmarks keep their own hues outside the media spectrum. */
export const ACCENT_TOKENS = {
  ALL: "#e4e4e7",
  PINNED: "#d4d4d8",
  FAVORITES: "#c49b56",
  TRANSFERS: "#a1a1aa",
  FOLDER: "#a1a1aa",
} as const;

export function isMediaCategory(value: string | null | undefined): value is FileCategory {
  return !!value && value in MEDIA_TOKENS;
}

/** Resolve a nav filter / category id to a media token, or null if it is not media. */
export function getCategoryToken(value: string | null | undefined): MediaToken | null {
  return isMediaCategory(value) ? MEDIA_TOKENS[value] : null;
}

/** Resolve any nav filter id to its indicator hue for sidebar/legend use. */
export function getFilterHue(value: string): string {
  if (isMediaCategory(value)) return MEDIA_TOKENS[value].hue;
  if (value in ACCENT_TOKENS) return ACCENT_TOKENS[value as keyof typeof ACCENT_TOKENS];
  return ACCENT_TOKENS.FOLDER;
}
