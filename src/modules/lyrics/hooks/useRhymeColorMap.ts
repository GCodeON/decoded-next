import { useMemo } from 'react';
import type { Word } from '../utils/lrcAdvanced';
import type { RhymeColorData, WordRhymeParts } from '../types/rhyme';
import {
  parseRhymeLine,
  sliceSegmentsToWords,
  buildColorMap,
} from '../utils/rhyme-parser';

export const useRhymeColorMap = (
  rhymeEncodedLines: string[] | undefined,
  lines: string[],
  wordsByLine: Word[][]
): RhymeColorData => {
  return useMemo(() => {
    const parsedLines = (rhymeEncodedLines || []).map(parseRhymeLine);

    const colorMap = buildColorMap(parsedLines);
    
    const wordPartsByLine: WordRhymeParts[][] = lines.map((lineText, idx) =>
      sliceSegmentsToWords(lineText, wordsByLine[idx] || [], parsedLines[idx])
    );

    return { colorMap, wordPartsByLine };
  }, [rhymeEncodedLines, lines, wordsByLine]);
};
