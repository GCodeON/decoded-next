import { parseEnhancedLrc, type LrcFile, type Word } from './lrcAdvanced';
import { parseLrcForEditing, matchLrcToPlainLines, generateLrc, isFullyStamped } from './lrc';

export interface DiffSummary {
  lineCountChanged: boolean;
  linesAdded: number;
  linesRemoved: number;
  linesModified: Array<{ index: number; before: string; after: string }>;
  wordTimingPreserved: Array<{ lineIndex: number; preservedCount: number; totalWords: number }>;
  interpolatedLineRanges: Array<{ startIndex: number; endIndex: number }>;
}

export interface RepairPreview {
  repairedSynced: string;
  repairedWordSynced: string | null;
  diffSummary: DiffSummary;
}

/**
 * Strip minimal HTML and split into plain lines.
 * Supports <p> and <br> as line delimiters. Removes other tags.
 * Filters out empty lines to match line count with synced LRC.
 */
export function extractPlainLinesFromHtml(htmlOrPlain: string): string[] {
  if (!htmlOrPlain) return [];
  const isHtml = /<[^>]+>/.test(htmlOrPlain);
  if (!isHtml) {
    return htmlOrPlain.split(/\r?\n/).filter(l => l.trim().length > 0);
  }
  // Normalize paragraph breaks to newlines, decode HTML entities
  let text = htmlOrPlain
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n')
    .replace(/<\s*p\s*>/gi, '')
    .replace(/<[^>]+>/g, '') // drop remaining tags
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r/g, '')
    .trim();
  const lines = text.split(/\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length > 0);
  return lines;
}

/**
 * Linear interpolation for missing timestamps. Returns a fully-populated array.
 * Leading/trailing gaps are extrapolated using nearest average delta.
 */
export function interpolateLineTimesLinear(times: (number | null)[]): number[] {
  const result = [...times];
  const n = result.length;

  // collect indexes of known times
  const known: number[] = [];
  for (let i = 0; i < n; i++) {
    if (result[i] != null) known.push(i);
  }
  if (known.length === 0) {
    // default to increasing 2s per line
    let t = 0;
    for (let i = 0; i < n; i++) result[i] = t += 2;
    return result as number[];
  }

  // fill between known points
  for (let k = 0; k < known.length - 1; k++) {
    const iLeft = known[k];
    const iRight = known[k + 1];
    const tLeft = result[iLeft] as number;
    const tRight = result[iRight] as number;
    const span = iRight - iLeft;
    for (let i = iLeft + 1; i < iRight; i++) {
      const frac = (i - iLeft) / span;
      result[i] = Number((tLeft + (tRight - tLeft) * frac).toFixed(2));
    }
  }

  // leading gaps
  const firstIdx = known[0];
  const secondIdx = known[1] ?? known[0];
  const deltaLead = secondIdx !== firstIdx
    ? Math.max(0.5, ((result[secondIdx] as number) - (result[firstIdx] as number)) / (secondIdx - firstIdx))
    : 2;
  for (let i = firstIdx - 1; i >= 0; i--) {
    result[i] = Number(((result[i + 1] as number) - deltaLead).toFixed(2));
  }

  // trailing gaps
  const lastIdx = known[known.length - 1];
  const prevIdx = known[known.length - 2] ?? known[known.length - 1];
  const deltaTrail = lastIdx !== prevIdx
    ? Math.max(0.5, ((result[lastIdx] as number) - (result[prevIdx] as number)) / (lastIdx - prevIdx))
    : 2;
  for (let i = lastIdx + 1; i < n; i++) {
    result[i] = Number(((result[i - 1] as number) + deltaTrail).toFixed(2));
  }

  return result as number[];
}

/**
 * Align existing synced LRC entries to plain lines, preserving original timestamps.
 * Returns array of timestamps matching plainLines order.
 */
export function alignLineTimestamps(
  plainLines: string[],
  existingSynced?: string | null
): (number | null)[] {
  if (!existingSynced) return new Array(plainLines.length).fill(null);
  const lrcEntries = parseLrcForEditing(existingSynced);
  
  // If line counts match exactly, preserve timestamps in order
  if (lrcEntries.length === plainLines.length) {
    return lrcEntries.map(e => e.time);
  }
  
  // Otherwise use greedy matching
  return matchLrcToPlainLines(plainLines, lrcEntries);
}

/**
 * Normalize text for matching (lowercase, remove punctuation)
 */
function normalizeForMatching(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Preserve existing word timings when token text aligns; otherwise, rebuild.
 * Uses normalized text matching (case-insensitive, punctuation-ignored) for better preservation.
 */
export function preserveAndRealignWordTimes(
  plainLine: string,
  parsedWords: Word[] | undefined
): Word[] {
  const tokens = plainLine.trim() ? plainLine.trim().split(/\s+/) : [];
  if (tokens.length === 0) return [];
  const preserved: Word[] = [];

  let cursor = 0;
  tokens.forEach((tok) => {
    const startRel = plainLine.indexOf(tok, cursor);
    const start = startRel >= 0 ? startRel : cursor;
    const end = start + tok.length;
    cursor = end + (plainLine[end] === ' ' ? 1 : 0);

    // Try exact match first, then normalized match
    let match = (parsedWords || []).find(w => w && w.text === tok);
    if (!match) {
      const normalizedTok = normalizeForMatching(tok);
      match = (parsedWords || []).find(w => w && normalizeForMatching(w.text) === normalizedTok);
    }
    
    if (match && typeof match.time === 'number') {
      preserved.push({ text: tok, time: Number(match.time.toFixed(3)), start, end });
    } else {
      preserved.push({ text: tok, time: NaN, start, end });
    }
  });

  return preserved;
}

/**
 * Distribute missing word times linearly within the line duration.
 * Only fills NaN times, preserves existing valid times.
 */
export function distributeWordTimesLinear(
  lineStart: number,
  lineEnd: number,
  words: Word[]
): Word[] {
  const n = words.length;
  const duration = Math.max(0.5, lineEnd - lineStart);
  
  // If only one word, anchor it to lineStart
  if (n === 1) {
    const w = words[0];
    const time = isFinite(w.time) ? w.time : Number(lineStart.toFixed(2));
    return [{ ...w, time }];
  }

  const out: Word[] = [];
  
  // First pass: preserve valid times, fill NaN with distributed timing
  for (let i = 0; i < n; i++) {
    const w = words[i];
    let time: number;
    
    if (isFinite(w.time)) {
      // Preserve existing valid time
      time = Number(w.time.toFixed(2));
    } else {
      // Distribute linearly for missing times
      const frac = n > 1 ? i / (n - 1) : 0;
      time = Number((lineStart + frac * duration).toFixed(2));
    }
    
    // Clamp to line boundaries
    const clamped = Math.min(Math.max(time, Number(lineStart.toFixed(2))), Number(lineEnd.toFixed(2)));
    out.push({ ...w, time: clamped });
  }
  
  // Second pass: ensure monotonic non-decreasing (only adjust distributed times if possible)
  for (let i = 1; i < n; i++) {
    if (out[i].time < out[i - 1].time) {
      // If current word had NaN (was distributed), adjust it
      if (!isFinite(words[i].time)) {
        out[i].time = out[i - 1].time;
      }
    }
  }
  
  return out;
}

/**
 * Build word timestamps map for generateEnhancedLrc.
 */
export function buildWordTimestampsMap(
  plainLines: string[],
  parsedEnhanced?: LrcFile,
  lineTimes?: number[]
): Map<number, Word[]> {
  const map = new Map<number, Word[]>();
  for (let i = 0; i < plainLines.length; i++) {
    const lineText = plainLines[i];
    const parsedLine = parsedEnhanced?.lines[i];
    const preserved = preserveAndRealignWordTimes(lineText, parsedLine?.words);

    const start = lineTimes?.[i] ?? parsedLine?.lineTime ?? 0;
    const end = (lineTimes && i + 1 < lineTimes.length) ? lineTimes[i + 1] : start + 2;
    const distributed = distributeWordTimesLinear(start, end, preserved);
    map.set(i, distributed);
  }
  return map;
}

/**
 * Generate a simple diff summary for preview.
 */
export function makeDiffSummary(
  originalSynced: string | undefined | null,
  repairedSynced: string,
  originalWordSynced: string | undefined | null,
  repairedWordSynced: string | undefined | null
): DiffSummary {
  const beforeLines = (originalSynced || '').split(/\r?\n/);
  const afterLines = (repairedSynced || '').split(/\r?\n/);
  const max = Math.max(beforeLines.length, afterLines.length);
  const modified: Array<{ index: number; before: string; after: string }> = [];
  let added = 0, removed = 0;

  for (let i = 0; i < max; i++) {
    const b = beforeLines[i];
    const a = afterLines[i];
    if (b == null && a != null) added++;
    else if (b != null && a == null) removed++;
    else if (b != null && a != null && b !== a) modified.push({ index: i, before: b, after: a });
  }

  const wordPreserved: Array<{ lineIndex: number; preservedCount: number; totalWords: number }> = [];
  if (originalWordSynced || repairedWordSynced) {
    const parsedBefore = originalWordSynced ? parseEnhancedLrc(originalWordSynced) : undefined;
    const parsedAfter = repairedWordSynced ? parseEnhancedLrc(repairedWordSynced) : undefined;
    const lines = Math.max(parsedBefore?.lines.length || 0, parsedAfter?.lines.length || 0);
    for (let i = 0; i < lines; i++) {
      const beforeWords = parsedBefore?.lines[i]?.words || [];
      const afterWords = parsedAfter?.lines[i]?.words || [];
      const total = afterWords.length;
      const preserved = afterWords.filter(w => beforeWords.some(bw => bw.text === w.text && Math.abs(bw.time - w.time) < 0.001)).length;
      wordPreserved.push({ lineIndex: i, preservedCount: preserved, totalWords: total });
    }
  }

  // Rough interpolation ranges (where synced lines changed)
  const interpolatedRanges: Array<{ startIndex: number; endIndex: number }> = [];
  let rangeStart: number | null = null;
  for (let i = 0; i < max; i++) {
    const b = beforeLines[i];
    const a = afterLines[i];
    if (b !== a) {
      if (rangeStart == null) rangeStart = i;
    } else {
      if (rangeStart != null) { interpolatedRanges.push({ startIndex: rangeStart, endIndex: i - 1 }); rangeStart = null; }
    }
  }
  if (rangeStart != null) interpolatedRanges.push({ startIndex: rangeStart, endIndex: max - 1 });

  return {
    lineCountChanged: beforeLines.length !== afterLines.length,
    linesAdded: added,
    linesRemoved: removed,
    linesModified: modified,
    wordTimingPreserved: wordPreserved,
    interpolatedLineRanges: interpolatedRanges,
  };
}

/**
 * Repair synced and word-synced records by replacing corrupted text with correct lyrics
 * while preserving all existing timestamps.
 */
export async function repairSyncedLyrics(
  plainOrRhymeHtml: string,
  existingSynced?: string | null,
  existingWordSynced?: string | null
): Promise<RepairPreview> {
  const plainLines = extractPlainLinesFromHtml(plainOrRhymeHtml);

  // Preserve existing timestamps, only interpolate if truly missing
  const aligned = alignLineTimestamps(plainLines, existingSynced);
  const hasAnyNull = aligned.some(t => t === null);
  const lineTimes = hasAnyNull ? interpolateLineTimesLinear(aligned) : (aligned as number[]);

  // Parse existing word-synced to preserve timings
  const parsedEnhanced = existingWordSynced ? parseEnhancedLrc(existingWordSynced) : undefined;
  const wordMap = buildWordTimestampsMap(plainLines, parsedEnhanced, lineTimes);

  // Generate outputs with corrected text
  const repairedSynced = generateLrc(plainLines, lineTimes);
  const repairedWordSynced = wordMap.size > 0 ?
    (await import('./lrcAdvanced')).generateEnhancedLrc(plainLines, lineTimes, wordMap) : null;

  // Validation guards
  if (!isFullyStamped(repairedSynced)) {
    throw new Error('Repaired synced LRC is not fully stamped.');
  }
  if (repairedWordSynced) {
    // Will throw if malformed
    parseEnhancedLrc(repairedWordSynced);
  }

  const diffSummary = makeDiffSummary(existingSynced, repairedSynced, existingWordSynced, repairedWordSynced);
  return { repairedSynced, repairedWordSynced, diffSummary };
}
