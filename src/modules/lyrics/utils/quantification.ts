import { vowels } from '../config/rhyme-colors';
import { parseRhymeLine } from './rhyme-parser';
import { parseLrcForEditing } from './lrc';
import type {
  LyricalQuantification,
  VowelStat,
  BarMetric,
  LiteraryDeviceStats,
} from '../types/quantification';

// Reverse lookup map from Hex/RGB color to Vowel IPA symbol and Category
interface VowelLookup {
  symbol: string;
  label: string;
  color: string;
  category: 'Monophthongs' | 'Diphthongs' | 'R-colored' | 'Reduced' | 'Custom';
}

const buildColorToVowelMap = (): Map<string, VowelLookup> => {
  const map = new Map<string, VowelLookup>();

  Object.entries(vowels).forEach(([category, vowelGroup]) => {
    Object.entries(vowelGroup).forEach(([symbol, info]) => {
      const normalizedHex = info.color.toLowerCase();
      const lookup: VowelLookup = {
        symbol,
        label: info.label,
        color: info.color,
        category: category as 'Monophthongs' | 'Diphthongs' | 'R-colored' | 'Reduced',
      };
      map.set(normalizedHex, lookup);
    });
  });

  return map;
};

const COLOR_TO_VOWEL_MAP = buildColorToVowelMap();

/**
 * Estimate syllable count for an English word using phonetic heuristic
 */
export const countWordSyllables = (word: string): number => {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  if (clean.length <= 3) return 1;

  let syllableCount = clean
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '')
    .match(/[aeiouy]{1,2}/g)?.length || 0;

  return Math.max(1, syllableCount);
};

/**
 * Normalizes hex or rgb color string to 6-digit hex lowercase
 */
const normalizeColor = (color: string | null): string | null => {
  if (!color) return null;
  const trimmed = color.trim().toLowerCase();
  
  if (trimmed.startsWith('#')) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
    }
    return trimmed;
  }

  const rgbMatch = trimmed.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  return trimmed;
};

/**
 * Analyze alliteration between words in a line or across consecutive lines
 */
const countAlliterations = (words: string[]): number => {
  let count = 0;
  let prevInitial: string | null = null;
  let streak = 0;

  for (const word of words) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (clean.length < 2) continue;
    const initial = clean[0];

    if (initial === prevInitial) {
      streak++;
      if (streak === 1) count++;
    } else {
      streak = 0;
    }
    prevInitial = initial;
  }

  return count;
};

/**
 * Calculate full Lyrical Quantification from rhymeEncodedLines and optional synced timestamps
 */
export const computeLyricalQuantification = ({
  rhymeEncodedLines,
  syncedLyrics,
  trackId,
  artist,
  title,
}: {
  rhymeEncodedLines: string[];
  syncedLyrics?: string | null;
  trackId?: string;
  artist?: string;
  title?: string;
}): LyricalQuantification => {
  const parsedLrc = syncedLyrics ? parseLrcForEditing(syncedLyrics) : [];
  const barMetrics: BarMetric[] = [];
  const vowelCounts: Record<string, { count: number; symbol: string; label: string; color: string; category: VowelStat['category'] }> = {};
  
  const categoryCounts = {
    Monophthongs: 0,
    Diphthongs: 0,
    'R-colored': 0,
    Reduced: 0,
  };

  let totalWords = 0;
  let totalSyllables = 0;
  let totalRhymedWords = 0;
  let totalRhymedSyllables = 0;
  let totalAssonancePairs = 0;
  let totalAlliterations = 0;
  let endRhymeMatches = 0;
  let multiSyllableChains = 0;

  const allWordsList: string[] = [];
  const lineEndVowels: (string | null)[] = [];

  rhymeEncodedLines.forEach((htmlLine, lineIdx) => {
    const parsed = parseRhymeLine(htmlLine);
    const lineText = parsed ? parsed.text.trim() : htmlLine.replace(/<[^>]+>/g, '').trim();
    if (!lineText) return;

    const words = lineText.split(/\s+/).filter(Boolean);
    allWordsList.push(...words);
    totalWords += words.length;

    let lineSyllables = 0;
    let lineRhymedSyllables = 0;
    const lineVowels: string[] = [];
    const lineColors: string[] = [];

    // Track segments & vowels
    if (parsed && parsed.segments.length > 0) {
      let activeRhymeStreak = 0;
      let lastVowelInLine: string | null = null;

      parsed.segments.forEach((seg) => {
        const segText = seg.text.trim();
        if (!segText) return;

        const syllables = countWordSyllables(segText);
        lineSyllables += syllables;

        const normalizedColor = normalizeColor(seg.bgColor);
        if (normalizedColor) {
          totalRhymedWords++;
          lineRhymedSyllables += syllables;
          activeRhymeStreak++;

          if (activeRhymeStreak >= 2) {
            multiSyllableChains++;
          }

          const lookup = COLOR_TO_VOWEL_MAP.get(normalizedColor);
          const symbol = lookup?.symbol || normalizedColor;
          const label = lookup?.label || 'Custom';
          const category = lookup?.category || 'Custom';
          const color = lookup?.color || normalizedColor;

          lastVowelInLine = symbol;
          lineVowels.push(symbol);
          lineColors.push(color);

          if (!vowelCounts[symbol]) {
            vowelCounts[symbol] = { count: 0, symbol, label, color, category };
          }
          vowelCounts[symbol].count += syllables;

          if (category in categoryCounts) {
            categoryCounts[category as keyof typeof categoryCounts] += syllables;
          }
        } else {
          activeRhymeStreak = 0;
        }
      });

      lineEndVowels.push(lastVowelInLine);

      // Assonance in line (more than 1 identical vowel in the same bar)
      const vowelFrequencyInBar = new Map<string, number>();
      lineVowels.forEach((v) => vowelFrequencyInBar.set(v, (vowelFrequencyInBar.get(v) || 0) + 1));
      vowelFrequencyInBar.forEach((freq) => {
        if (freq > 1) {
          totalAssonancePairs += freq - 1;
        }
      });
    } else {
      words.forEach((w) => {
        lineSyllables += countWordSyllables(w);
      });
      lineEndVowels.push(null);
    }

    totalSyllables += lineSyllables;
    totalRhymedSyllables += lineRhymedSyllables;

    totalAlliterations += countAlliterations(words);

    // Correlate with LRC timestamp if line index matches
    const lrcItem = parsedLrc[lineIdx];
    const timeSec = lrcItem ? lrcItem.time : undefined;

    const barDensity = lineSyllables > 0 ? Math.min(1, lineRhymedSyllables / lineSyllables) : 0;

    barMetrics.push({
      barIndex: barMetrics.length + 1,
      lineIndex: lineIdx,
      text: lineText,
      timeSec,
      syllableCount: lineSyllables,
      rhymedSyllableCount: lineRhymedSyllables,
      rhymeDensity: Number(barDensity.toFixed(2)),
      vowels: Array.from(new Set(lineVowels)),
      colors: Array.from(new Set(lineColors)),
    });
  });

  // Calculate End Rhyme Matches across adjacent lines (AABB / ABAB schemes)
  for (let i = 1; i < lineEndVowels.length; i++) {
    const curr = lineEndVowels[i];
    const prev = lineEndVowels[i - 1];
    const prev2 = i >= 2 ? lineEndVowels[i - 2] : null;

    if (curr && (curr === prev || curr === prev2)) {
      endRhymeMatches++;
    }
  }

  const totalBars = Math.max(1, barMetrics.length);
  const avgSyllablesPerBar = Number((totalSyllables / totalBars).toFixed(1));
  const rhymeDensity = totalSyllables > 0 ? Number(((totalRhymedSyllables / totalSyllables) * 100).toFixed(1)) : 0;
  const uniqueRhymeCount = Object.keys(vowelCounts).length;

  const totalCategorizedVowels = Math.max(
    1,
    categoryCounts.Monophthongs + categoryCounts.Diphthongs + categoryCounts['R-colored'] + categoryCounts.Reduced
  );

  const vowelCategoryDistribution = {
    Monophthongs: {
      count: categoryCounts.Monophthongs,
      percentage: Number(((categoryCounts.Monophthongs / totalCategorizedVowels) * 100).toFixed(1)),
    },
    Diphthongs: {
      count: categoryCounts.Diphthongs,
      percentage: Number(((categoryCounts.Diphthongs / totalCategorizedVowels) * 100).toFixed(1)),
    },
    'R-colored': {
      count: categoryCounts['R-colored'],
      percentage: Number(((categoryCounts['R-colored'] / totalCategorizedVowels) * 100).toFixed(1)),
    },
    Reduced: {
      count: categoryCounts.Reduced,
      percentage: Number(((categoryCounts.Reduced / totalCategorizedVowels) * 100).toFixed(1)),
    },
  };

  const vowelDistribution: Record<string, VowelStat> = {};
  const totalVowelHits = Math.max(1, Object.values(vowelCounts).reduce((acc, v) => acc + v.count, 0));

  Object.entries(vowelCounts).forEach(([symbol, info]) => {
    vowelDistribution[symbol] = {
      count: info.count,
      percentage: Number(((info.count / totalVowelHits) * 100).toFixed(1)),
      label: info.label,
      color: info.color,
      category: info.category,
    };
  });

  const internalRhymeDensity = Number(
    Math.min(100, Math.max(0, (totalAssonancePairs / Math.max(1, totalBars)) * 25)).toFixed(1)
  );
  const endRhymeDensity = Number(
    Math.min(100, (endRhymeMatches / Math.max(1, totalBars)) * 100).toFixed(1)
  );

  const literaryDevices: LiteraryDeviceStats = {
    assonanceCount: totalAssonancePairs,
    alliterationCount: totalAlliterations,
    slantRhymeCount: Math.round(totalAssonancePairs * 0.4),
    multiSyllableChainsCount: multiSyllableChains,
    internalRhymeDensity,
    endRhymeDensity,
  };

  // Complexity score (0 - 100 composite formula)
  // Combines rhyme density (40%), syllable speed/balance (20%), internal rhyme assonance (20%), and unique rhyme breadth (20%)
  const densityPart = Math.min(40, rhymeDensity * 0.4);
  const syllablePart = Math.min(20, (avgSyllablesPerBar / 14) * 20);
  const assonancePart = Math.min(20, (internalRhymeDensity / 50) * 20);
  const vocabularyPart = Math.min(20, (uniqueRhymeCount / 12) * 20);

  const complexityScore = Math.min(100, Math.round(densityPart + syllablePart + assonancePart + vocabularyPart));

  return {
    trackId,
    artist,
    title,
    computedAt: new Date().toISOString(),
    complexityScore,
    rhymeDensity,
    avgSyllablesPerBar,
    uniqueRhymeCount,
    totalBars,
    totalWords,
    totalSyllables,
    totalRhymedWords,
    vowelDistribution,
    vowelCategoryDistribution,
    literaryDevices,
    barMetrics,
  };
};
