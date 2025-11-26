
export const mstoSeconds = (duration: number): number => {
  return Math.round(duration / 1000);
};

export const cleanTrackName = (name: string): string => {
    return name.replace(/&/g, 'and').split('(')[0].trim();
};

export const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toFixed(2).padStart(5, '0');
    return `[${m}:${s}]`;
};

// Accept LRC Timestamp formats: 1:23.45, 01:23.45, 123.45, 90
export const parseLrcTime = (input: string): number => {
    const trimmed = input.trim().replace(/\[|\]/g, '');
    const match = trimmed.match(/^(\d+):(\d+(\.\d+)?)$/);
    if (match) {
        const mins = parseInt(match[1], 10);
        const secs = parseFloat(match[2]);
        return mins * 60 + secs;
    }
    const secs = parseFloat(trimmed);
    return isNaN(secs) ? NaN : secs;
};

// LRC Parser
export const parseLrcForEditing = (lrc: string): { time: number; text: string }[] => {
  if (!lrc?.trim()) return [];

  const entries: { time: number; text: string }[] = [];

  lrc.split('\n').forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;

    // Find all [mm:ss.xx] or [m:ss.xx]
    const timeTags = line.match(/\[\d+:\d+(?:\.\d+)?\]/g);
    if (!timeTags) return;

    // Extract text after last timestamp
    const lastTag = timeTags[timeTags.length - 1];
    const textStart = line.lastIndexOf(lastTag) + lastTag.length;
    let text = line.slice(textStart).trim();

    // Remove word-level tags <...>
    text = text.replace(/<\d+(?::\d+(?:\.\d+)?)?>/g, '').trim();

    // Parse each timestamp
    timeTags.forEach(tag => {
      const match = tag.match(/\[(\d+):(\d+(?:\.\d+)?)\]/);
      if (!match) return;

      const mins = parseInt(match[1], 10);
      const secs = parseFloat(match[2]);
      if (isNaN(mins) || isNaN(secs)) return;

      entries.push({
        time: mins * 60 + secs,
        text,
      });
    });
  });

  return entries.sort((a, b) => a.time - b.time);
};

// Advanced Greedy Chronological Matching
export const matchLrcToPlainLines = (
  plainLines: string[],
  lrcEntries: { time: number; text: string }[]
): (number | null)[] => {
  const result = new Array(plainLines.length).fill(null);
  let lrcIndex = 0;

  const normalize = (s: string) =>
    s.replace(/[.,!?…"'’()–—-]/g, '').toLowerCase().trim();

  for (let i = 0; i < plainLines.length && lrcIndex < lrcEntries.length; i++) {
    const plain = plainLines[i];
    const lrc = lrcEntries[lrcIndex];

    const plainNorm = normalize(plain);
    const lrcNorm = normalize(lrc.text);

    if (
      plain === lrc.text ||
      plainNorm === lrcNorm ||
      plainNorm.includes(lrcNorm) ||
      lrcNorm.includes(plainNorm)
    ) {
      result[i] = Number(lrc.time.toFixed(2));
      lrcIndex++;
    }
    // Else: skip this plain line (could be missing in LRC)
  }

  return result;
};