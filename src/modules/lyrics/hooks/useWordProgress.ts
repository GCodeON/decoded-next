import { useCallback } from 'react';
import type { Word } from '../utils/lrcAdvanced';
import { DEFAULT_WORD_DURATION } from '../config/sync-constants';

export const useWordProgress = (
  words: Word[],
  currentTimeSec: number,
  isPast: boolean,
  filledWords: number
) => {
  return useCallback(
    (index: number): number => {
      if (isPast || index < filledWords) return 1;

      const word = words[index];
      const next = words[index + 1];
      const prev = words[index - 1];

      const start = word.time;
      const estimatedDuration = prev ? start - prev.time : DEFAULT_WORD_DURATION.FALLBACK;
      const end =
        next?.time ??
        start +
          Math.max(
            DEFAULT_WORD_DURATION.MIN,
            Math.min(DEFAULT_WORD_DURATION.MAX, estimatedDuration)
          );

      if (currentTimeSec <= start) return 0;
      if (currentTimeSec >= end) return 1;
      return (currentTimeSec - start) / Math.max(end - start, 0.001);
    },
    [words, currentTimeSec, isPast, filledWords]
  );
};
