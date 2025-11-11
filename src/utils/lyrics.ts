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