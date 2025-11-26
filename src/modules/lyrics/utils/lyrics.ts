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
  const lrcTexts = lrc
    .split('\n')
    .map(line => line.replace(/\[[\d:]+\.\d+\]/g, '').trim())
    .filter(Boolean);

  // Convert rhymeEncoded HTML to array of lines preserving HTML
  const div = document.createElement('div');
  div.innerHTML = rhymeEncoded
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]*>/g, (match) => match.includes('span') ? match : '');

  const htmlLines = div.innerHTML
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const result: string[] = [];
  let lrcIndex = 0;

  for (const htmlLine of htmlLines) {
    const cleanText = htmlLine.replace(/<[^>]*>/g, '').trim();
    if (lrcIndex < lrcTexts.length && cleanText.includes(lrcTexts[lrcIndex].slice(0, 15))) {
      result.push(htmlLine || lrcTexts[lrcIndex]);
      lrcIndex++;
    } else if (cleanText) {
      result.push(htmlLine);
    }
  }

  // Fill any missing lines
  while (result.length < lrcTexts.length) {
    result.push(lrcTexts[result.length]);
  }

  return result;
}