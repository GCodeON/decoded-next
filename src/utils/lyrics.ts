
export const htmlToLyrics = (html: string): string => {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p><p>/gi, '\n\n')
    .replace(/<\/?[^>]+(>|$)/g, '') // strip all remaining HTML tags
    .replace(/\n{3,}/g, '\n\n')     // collapse 3+ newlines into 2
    .trim();
};

export const lyricsToHtml = (text: string): string => {
  if (!text) return '<p><br></p>';
  return (
    '<p>' +
    text
      .replace(/\n\n/g, '</p><p><br></p><p>') // double newline → paragraph break
      .replace(/\n/g, '<br>')                // single newline → line break
      .replace(/<p><\/p>/g, '<p><br></p>')   // ensure empty paragraphs render
    + '</p>'
  );
};