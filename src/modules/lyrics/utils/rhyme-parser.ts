import type { ParsedRhymeLine, RhymeSegment, WordRhymeParts } from '../types/rhyme';
import type { Word } from './lrcAdvanced';

/**
 * Extract background-color or color from inline style string
 */
export const extractColor = (style: string): string | null => {
  if (!style) return null;
  const bgMatch = style.match(/background-color:\s*([^;]+)/i);
  if (bgMatch?.[1]) return bgMatch[1].trim();
  const colorMatch = style.match(/color:\s*([^;]+)/i);
  return colorMatch?.[1]?.trim() || null;
};

/**
 * Parse HTML line into text segments with color metadata
 * Walks the DOM tree and extracts text segments with their background colors
 */
export const parseRhymeLine = (html?: string): ParsedRhymeLine | null => {
  if (!html) return null;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  const segments: RhymeSegment[] = [];
  let cursor = 0;

  const walk = (node: ChildNode, activeColor: string | null): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (!text) return;
      segments.push({
        text,
        color: activeColor,
        start: cursor,
        end: cursor + text.length,
      });
      cursor += text.length;
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const nextColor =
        el.tagName.toLowerCase() === 'span'
          ? extractColor(el.getAttribute('style') || '') || activeColor
          : activeColor;

      Array.from(el.childNodes).forEach((child) => walk(child, nextColor));
    }
  };

  Array.from(wrapper.childNodes).forEach((child) => walk(child, null));

  return {
    text: segments.map((s) => s.text).join(''),
    segments,
  };
};

/**
 * Find character positions of words within line text
 * Supports case-insensitive matching as fallback
 */
export const buildWordRanges = (lineText: string, words: Word[]) => {
  const ranges: { start: number; end: number; text: string }[] = [];
  let searchFrom = 0;

  for (const word of words) {
    const idx =
      lineText.indexOf(word.text, searchFrom) !== -1
        ? lineText.indexOf(word.text, searchFrom)
        : lineText.toLowerCase().indexOf(word.text.toLowerCase(), searchFrom);

    if (idx === -1) {
      ranges.push({ start: -1, end: -1, text: word.text });
    } else {
      ranges.push({ start: idx, end: idx + word.text.length, text: word.text });
      searchFrom = idx + word.text.length;
    }
  }

  return ranges;
};

/**
 * Slice rhyme segments to align with LRC word boundaries
 * Maps colored segments from HTML to specific words in the line
 */
export const sliceSegmentsToWords = (
  lineText: string,
  words: Word[],
  parsed?: ParsedRhymeLine | null
): WordRhymeParts[] => {
  if (!parsed) return words.map(() => []);

  const ranges = buildWordRanges(lineText, words);
  return ranges.map((range) => {
    if (range.start === -1) return [];

    const parts: RhymeSegment[] = [];

    for (const seg of parsed.segments) {
      const overlapStart = Math.max(range.start, seg.start);
      const overlapEnd = Math.min(range.end, seg.end);
      if (overlapStart >= overlapEnd) continue;

      const localStart = overlapStart - seg.start;
      const localEnd = overlapEnd - seg.start;
      const text = seg.text.slice(localStart, localEnd);

      if (text) {
        parts.push({
          text,
          color: seg.color,
          start: overlapStart,
          end: overlapEnd,
        });
      }
    }

    return parts.length > 0
      ? parts
      : [{ text: range.text, color: null, start: range.start, end: range.end }];
  });
};

/**
 * Build a fallback color map from all rhyme segments
 * Maps normalized word text to their most common color
 */
export const buildColorMap = (parsedLines: (ParsedRhymeLine | null)[]): Map<string, string> => {
  const colorMap = new Map<string, string>();

  for (const parsed of parsedLines) {
    if (!parsed) continue;
    for (const seg of parsed.segments) {
      if (!seg.color) continue;
      const clean = seg.text.toLowerCase().replace(/[^\w']/g, '');
      if (clean && !colorMap.has(clean)) {
        colorMap.set(clean, seg.color);
      }
    }
  }

  return colorMap;
};
