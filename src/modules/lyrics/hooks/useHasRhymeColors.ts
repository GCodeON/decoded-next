import { useMemo } from 'react';
import type { LyricsForDisplay } from './useDisplayLyrics';

const MAX_LINES_SCAN = 120;
const HAS_COLOR_STYLE = /style\s*=\s*"[^"]*color:/i;
const HAS_UNDERLINE = /<u>/i;

export function useHasRhymeColors(
  display: LyricsForDisplay | null,
  options?: { maxLines?: number }
): boolean {
  const maxLines = options?.maxLines ?? MAX_LINES_SCAN;

  return useMemo(() => {
    if (!display) return false;

    // Prefer rhymeEncodedLines (synced) over rhymeEncoded (unsynced)
    const linesToCheck = display.rhymeEncodedLines || (display.rhymeEncoded ? [display.rhymeEncoded] : []);

    if (!linesToCheck || linesToCheck.length === 0) return false;

    // Scan up to maxLines for color or underline markers
    const linesToScan = linesToCheck.slice(0, maxLines);

    for (const line of linesToScan) {
      if (!line) continue;

      // Cheap regex pre-check for color styles or underline tags
      if (HAS_COLOR_STYLE.test(line) || HAS_UNDERLINE.test(line)) {
        return true;
      }
    }

    return false;
  }, [display, maxLines]);
}
