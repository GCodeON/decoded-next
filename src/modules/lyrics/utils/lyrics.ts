const BLOCK_TAG_PATTERN = /<\s*(?:\/)?(?:p|div|section|article|header|footer|li|ul|ol|blockquote|pre|tr|table|thead|tbody|tfoot|h[1-6])\b[^>]*>/gi;

const normalizeLineBreaks = (value: string): string =>
  value.replace(/\r\n?/g, '\n').replace(/\n{2,}/g, '\n');

export const normalizeHtmlForPlainText = (html: string): string => {
  if (!html) return '';

  return normalizeLineBreaks(
    html
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(BLOCK_TAG_PATTERN, '\n')
      .replace(/>\s+</g, '>\n<')
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

const looksLikeFragmentedFallback = (lines: string[]): boolean => {
  if (lines.length < 6) return false;

  const wordCounts = lines.map((line) => line.split(/\s+/).filter(Boolean).length);
  const shortLineCount = wordCounts.filter((count) => count <= 2).length;
  const singleWordCount = wordCounts.filter((count) => count === 1).length;
  const tinyLineRatio = shortLineCount / lines.length;

  return tinyLineRatio >= 0.35 || singleWordCount >= 4;
};

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
  const fallbackIsFragmented = looksLikeFragmentedFallback(structuredFallback);

  if (fallbackIsFragmented) {
    if (plainLines.length > 0) return plainLines;
    if (htmlFallbackLines.length > 1 && !looksLikeFragmentedFallback(htmlFallbackLines)) {
      return htmlFallbackLines;
    }
  }

  if (
    structuredFallback.length > 1 &&
    !fallbackIsFragmented &&
    (plainLooksFlattened || plainLines.length <= structuredFallback.length)
  ) {
    return structuredFallback;
  }

  if (fallbackLines && fallbackLines.length > 1 && preservedFallback.length > 1 && !looksLikeFragmentedFallback(preservedFallback)) {
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

export function mapLrcToRhymeHtml(lrc: string, rhymeEncoded: string): string[] {
  // Extract text from LRC, preserving empty lines for instrumental breaks
  const lrcTexts = lrc
    .split('\n')
    .map(line => line.replace(/\[[\d:]+\.\d+\]/g, '').trim());
  // DON'T filter(Boolean) - we need to keep empty strings!

  // Convert rhymeEncoded HTML to array of lines preserving HTML
  const div = document.createElement('div');
  div.innerHTML = rhymeEncoded
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]*>/g, (match) => {
      const lower = match.toLowerCase();
      return lower.includes('span') || lower.startsWith('<u') || lower.startsWith('</u') ? match : '';
    });

  const htmlLines = div.innerHTML
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean); // Keep this filter for HTML lines

  const result: string[] = [];
  let htmlIndex = 0;

  for (const lrcText of lrcTexts) {
    if (!lrcText) {
      // Empty LRC line - instrumental break
      result.push('');
    } else if (htmlIndex < htmlLines.length) {
      const cleanText = htmlLines[htmlIndex].replace(/<[^>]*>/g, '').trim();
      if (cleanText.includes(lrcText.slice(0, 15)) || lrcText.includes(cleanText.slice(0, 15))) {
        result.push(htmlLines[htmlIndex]);
        htmlIndex++;
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