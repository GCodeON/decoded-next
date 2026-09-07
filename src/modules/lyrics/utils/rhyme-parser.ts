import type { ParsedRhymeLine, RhymeSegment, WordRhymeParts } from '../types/rhyme';
import type { Word } from './lrcAdvanced';

type StyleState = {
  bgColor: string | null;
  textColor: string | null;
  underline: boolean;
};

/**
 * Extract background/text color and underline flag from inline style string
 */
export const extractStyles = (style: string): Partial<StyleState> => {
  if (!style) return {};

  const bgMatch = style.match(/background-color:\s*([^;]+)/i);
  const colorMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/i);
  const textDecoration = style.match(/text-decoration\s*:\s*([^;]+)/i);

  const underline = textDecoration ? /underline/i.test(textDecoration[1]) : undefined;

  return {
    bgColor: bgMatch?.[1]?.trim() || null,
    textColor: colorMatch?.[1]?.trim() || null,
    underline,
  };
};

const decodeHtmlEntities = (text: string): string =>
  text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, value: string) => String.fromCodePoint(parseInt(value, 16)))
    .replace(/&#(\d+);/g, (_, value: string) => String.fromCodePoint(parseInt(value, 10)));

/**
 * Parse HTML line into text segments with color metadata.
 *
 * This intentionally uses a small tokenizer instead of the DOM so the same
 * utility can run in browser components and Node.js route handlers.
 */
export const parseRhymeLine = (html?: string): ParsedRhymeLine | null => {
  if (!html) return null;

  const segments: RhymeSegment[] = [];
  let cursor = 0;
  const baseStyle: StyleState = { bgColor: null, textColor: null, underline: false };
  const styleStack: { tag: string; style: StyleState }[] = [{ tag: '#root', style: baseStyle }];
  const tokenPattern = /<!--[\s\S]*?-->|<[^>]*>|[^<]+/g;

  for (const token of html.match(tokenPattern) || []) {
    if (token.startsWith('<!--')) continue;

    if (token.startsWith('<')) {
      const closingMatch = token.match(/^<\s*\/\s*([\w-]+)/);
      if (closingMatch) {
        const tag = closingMatch[1].toLowerCase();
        for (let index = styleStack.length - 1; index > 0; index -= 1) {
          if (styleStack[index].tag === tag) {
            styleStack.length = index;
            break;
          }
        }
        continue;
      }

      const openingMatch = token.match(/^<\s*([\w-]+)/);
      if (!openingMatch) continue;

      const tag = openingMatch[1].toLowerCase();
      const styleMatch = token.match(/\bstyle\s*=\s*(["'])([\s\S]*?)\1/i);
      const inlineStyles = extractStyles(styleMatch?.[2] || '');
      const parentStyle = styleStack[styleStack.length - 1].style;
      const nextStyle: StyleState = {
        bgColor: inlineStyles.bgColor ?? parentStyle.bgColor,
        textColor: inlineStyles.textColor ?? parentStyle.textColor,
        underline:
          inlineStyles.underline !== undefined
            ? inlineStyles.underline
            : tag === 'u'
            ? true
            : parentStyle.underline,
      };

      if (!/\/\s*>$/.test(token) && !['br', 'img', 'input', 'meta', 'link', 'hr'].includes(tag)) {
        styleStack.push({ tag, style: nextStyle });
      }
      continue;
    }

    const text = decodeHtmlEntities(token);
    if (!text) continue;
    const activeStyle = styleStack[styleStack.length - 1].style;
    segments.push({
      text,
      bgColor: activeStyle.bgColor,
      textColor: activeStyle.textColor,
      underline: activeStyle.underline,
      start: cursor,
      end: cursor + text.length,
    });
    cursor += text.length;
  }

  return {
    text: segments.map((s) => s.text).join(''),
    segments,
  };
};

/**
 * Extract trailing punctuation from a word
 * Returns { cleanWord, punctuation }
 */
const splitWordAndPunctuation = (text: string): { clean: string; punctuation: string } => {
  const match = text.match(/^(.*?)([^\w\s']*)$/);
  return {
    clean: match?.[1] || text,
    punctuation: match?.[2] || '',
  };
};

/**
 * Find character positions of words within line text
 * Strips punctuation for matching but preserves full word.text in ranges
 * Supports case-insensitive matching as fallback
 */
export const buildWordRanges = (lineText: string, words: Word[]) => {
  const ranges: { start: number; end: number; text: string; clean: string }[] = [];
  let searchFrom = 0;

  for (const word of words) {
    // If parser already provided exact positions, prefer them
    if (typeof word.start === 'number' && typeof word.end === 'number') {
      ranges.push({ start: word.start, end: word.end, text: word.text, clean: word.text });
      searchFrom = word.end;
      continue;
    }

    const { clean: cleanWord, punctuation } = splitWordAndPunctuation(word.text);
    
    // Search for clean word (without punctuation)
    let idx = lineText.indexOf(cleanWord, searchFrom);
    if (idx === -1) {
      idx = lineText.toLowerCase().indexOf(cleanWord.toLowerCase(), searchFrom);
    }

    if (idx === -1) {
      ranges.push({ start: -1, end: -1, text: word.text, clean: cleanWord });
    } else {
      // Range includes punctuation if it follows immediately after the clean word
      const endPos = idx + cleanWord.length;
      const trailingInText = lineText.slice(endPos, endPos + punctuation.length);
      const fullLength = (trailingInText === punctuation || trailingInText.match(/^[^\w\s']/)) 
        ? cleanWord.length + punctuation.length 
        : cleanWord.length;
      
      ranges.push({ 
        start: idx, 
        end: idx + fullLength, 
        text: word.text,
        clean: cleanWord 
      });
      searchFrom = idx + fullLength;
    }
  }

  return ranges;
};

/**
 * Slice rhyme segments to align with LRC word boundaries
 * Maps colored segments from HTML to specific words in the line
 * Handles punctuation as separate (uncolored) segments for clarity
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
          bgColor: seg.bgColor,
          textColor: seg.textColor,
          underline: seg.underline,
          start: overlapStart,
          end: overlapEnd,
        });
      }
    }

    // Fallback: if no segments found, create one with no color (transparent/uncolored)
    if (parts.length === 0) {
      parts.push({
        text: range.text,
        bgColor: null,
        textColor: null,
        underline: false,
        start: range.start,
        end: range.end,
      });
    }

    return parts;
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
      const color = seg.bgColor || seg.textColor;
      if (!color) continue;
      const clean = seg.text.toLowerCase().replace(/[^\w']/g, '');
      if (clean && !colorMap.has(clean)) {
        colorMap.set(clean, color);
      }
    }
  }

  return colorMap;
};
