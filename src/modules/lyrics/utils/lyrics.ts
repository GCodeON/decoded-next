const BLOCK_TAG_PATTERN = /<\s*(?:\/)?(?:p|div|section|article|header|footer|li|ul|ol|blockquote|pre|tr|table|thead|tbody|tfoot|h[1-6])\b[^>]*>/gi;

const normalizeLineBreaks = (value: string): string =>
  value.replace(/\r\n?/g, '\n').replace(/\n{2,}/g, '\n');

export const normalizeHtmlForPlainText = (html: string): string => {
  if (!html) return '';

  return normalizeLineBreaks(
    html
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(BLOCK_TAG_PATTERN, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\u00A0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
  ).trim();
};

const isPlaceholderLyricLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return /^(?:\[\s*--:\s*--\.\s*--\s*\]|Set Now)$/i.test(trimmed);
};

const hasExplicitHtmlLineBreaks = (html: string): boolean => {
  if (!html) return false;
  return /<(?:br|p|div|section|article|header|footer|li|ul|ol|blockquote|pre|tr|table|thead|tbody|tfoot|h[1-6])\b/i.test(html);
};

const splitMergedLyricFragments = (lines: string[]): string[] =>
  lines.flatMap((line) => {
    const splitLine = line.replace(/([a-z]|['’])(?=[A-Z])/g, '$1\n');
    return sanitizeLineList(splitLine.split('\n'));
  });

const sanitizeLineList = (lines: string[]): string[] =>
  lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isPlaceholderLyricLine(line));

const extractHtmlLineEntries = (htmlLike: string | null | undefined): string[] => {
  if (!htmlLike) return [];
  if (!hasExplicitHtmlLineBreaks(htmlLike)) return [];

  const text = normalizeHtmlForPlainText(htmlLike);
  return sanitizeLineList(text.split('\n'));
};

export const splitLyricsIntoLines = (
  plainLyrics: string,
  fallbackHtml?: string,
  fallbackLines?: string[]
): string[] => {
  const trimmedPlain = (plainLyrics ?? '').replace(/\r\n?/g, '\n');
  const plainLines = splitMergedLyricFragments(sanitizeLineList(trimmedPlain.split('\n')));

  const preservedFallback = (() => {
    if (!fallbackLines || fallbackLines.length <= 1) return [];
    return splitMergedLyricFragments(
      fallbackLines
        .map((line) => line.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim())
        .filter((line) => line.length > 0)
    );
  })();

  const htmlFallbackLines = splitMergedLyricFragments(extractHtmlLineEntries(fallbackHtml));
  const structuredFallback = preservedFallback.length > 1 ? preservedFallback : htmlFallbackLines;
  const plainLooksFlattened = plainLines.length <= 1 && !!trimmedPlain && !trimmedPlain.includes('\n');

  if (structuredFallback.length > 1 && (plainLooksFlattened || plainLines.length <= structuredFallback.length)) {
    return structuredFallback;
  }

  if (fallbackLines && fallbackLines.length > 1 && preservedFallback.length > 1) {
    return preservedFallback;
  }

  if (plainLines.length > 1) {
    return plainLines;
  }

  if (htmlFallbackLines.length > 1) {
    return htmlFallbackLines;
  }

  return trimmedPlain ? sanitizeLineList([trimmedPlain.trim()]) : [];
};

export const htmlToLyrics = (html: string): string => {
  return normalizeHtmlForPlainText(html);
};

export const lyricsToHtml = (text: string): string => {
  if (!text) return '<p><br></p>';

  const lines = normalizeLineBreaks(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return '<p>' + lines.join('<br>') + '</p>';
};

const extractLrcTextEntries = (lrc: string): string[] => {
  const entries: string[] = [];
  const timestampPattern = /\[(\d+):(\d+(?:\.\d+)?)\]/g;

  for (const rawLine of lrc.split(/\r?\n/)) {
    const matches = Array.from(rawLine.matchAll(timestampPattern));

    matches.forEach((match, index) => {
      const timestampIndex = match.index ?? 0;
      const nextTimestampIndex = matches[index + 1]?.index ?? rawLine.length;
      const textStart = timestampIndex + match[0].length;

      entries.push(
        rawLine
          .slice(textStart, nextTimestampIndex)
          .replace(/<\d+(?::\d+(?:\.\d+)?)?>/g, '')
          .trim()
      );
    });
  }

  return entries;
};

export function mapLrcToRhymeHtml(lrc: string, rhymeEncoded: string): string[] {
  // Extract text from LRC, preserving empty lines for instrumental breaks
  const lrcTexts = extractLrcTextEntries(lrc);
  // DON'T filter(Boolean) - we need to keep empty strings!

  // Convert rhymeEncoded HTML to array of lines preserving HTML
  const lineBreakMarker = '__DECODED_LYRIC_LINE_BREAK__';
  const div = document.createElement('div');
  div.innerHTML = rhymeEncoded
    .replace(/<br\s*\/?>/gi, lineBreakMarker)
    .replace(/<\s*\/?(?:p|div|section|article|header|footer|li|ul|ol|blockquote|pre|tr|table|thead|tbody|tfoot|h[1-6])\b[^>]*>/gi, lineBreakMarker)
    .replace(/<[^>]*>/g, (match) => {
      const lower = match.toLowerCase();
      return lower.includes('span') || lower.startsWith('<u') || lower.startsWith('</u') ? match : '';
    });

  const htmlLines = div.innerHTML
    .split(lineBreakMarker)
    .map(l => l.trim())
    .filter(Boolean); // Keep this filter for HTML lines

  if (lrcTexts.length === htmlLines.length && lrcTexts.every((text) => text.length > 0)) {
    return htmlLines;
  }

  const result: string[] = [];
  let htmlIndex = 0;

  const normalizeMappedText = (value: string): string =>
    value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

  for (const lrcText of lrcTexts) {
    if (!lrcText) {
      // Empty LRC line - instrumental break
      result.push('');
    } else if (htmlIndex < htmlLines.length) {
      const normalizedLrcText = normalizeMappedText(lrcText);
      const matchIndex = htmlLines.findIndex((htmlLine, index) => {
        if (index < htmlIndex) return false;
        const normalizedHtmlText = normalizeMappedText(htmlLine);
        return normalizedHtmlText === normalizedLrcText;
      });

      if (matchIndex >= 0) {
        result.push(htmlLines[matchIndex]);
        htmlIndex = matchIndex + 1;
      } else {
        // No matching HTML, use plain text
        result.push(lrcText);
      }
    } else {
      // No more HTML lines, use plain text
      result.push(lrcText);
    }
  }

  return result;
}

// Utility function to normalize word keys consistently
export const normalizeWordKey = (word: string): string => {
  return word.toLowerCase().replace(/[^\\w']/g, '');
};