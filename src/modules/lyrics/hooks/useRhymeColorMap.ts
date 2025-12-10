import { useMemo } from 'react';
import type { Word } from '../utils/lrcAdvanced';
import type { RhymeColorData, WordRhymeParts } from '../types/rhyme';
import {
  parseRhymeLine,
  sliceSegmentsToWords,
  buildColorMap,
} from '../utils/rhyme-parser';

/**
 * Parse rhyme-encoded HTML and build per-word color segments
 * Returns both a word-to-color map (for fallback) and per-word segment arrays
 */
export const useRhymeColorMap = (
  rhymeEncodedLines: string[] | undefined,
  lines: string[],
  wordsByLine: Word[][]
): RhymeColorData => {
  return useMemo(() => {
    const parsedLines = (rhymeEncodedLines || []).map(parseRhymeLine);

    // Build fallback color map from all segments
    const colorMap = buildColorMap(parsedLines);

    // Slice segments to word boundaries
    const wordPartsByLine: WordRhymeParts[][] = lines.map((lineText, idx) =>
      sliceSegmentsToWords(lineText, wordsByLine[idx] || [], parsedLines[idx])
    );

    return { colorMap, wordPartsByLine };
  }, [rhymeEncodedLines, lines, wordsByLine]);
};
