export const htmlToLyrics = (html: string): string => {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p><p>/gi, '\n\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const lyricsToHtml = (text: string): string => {
  if (!text) return '<p><br></p>';
  return (
    '<p>' +
    text
      .replace(/\n\n/g, '</p><p><br></p><p>')
      .replace(/\n/g, '<br>')
      .replace(/<p><\/p>/g, '<p><br></p>')
    + '</p>'
  );
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
    .replace(/<[^>]*>/g, (match) => match.includes('span') ? match : '');

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