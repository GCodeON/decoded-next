
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

// LRC Parser - PRESERVES EMPTY LINES for instrumental breaks
export const parseLrcForEditing = (lrc: string): { time: number; text: string }[] => {
  if (!lrc?.trim()) return [];

  const entries: { time: number; text: string }[] = [];
  const lineRegex = /\[(\d+):(\d+(?:\.\d+)?)\]/g;

  lrc.split(/\r?\n/).forEach(rawLine => {
    if (!rawLine) return; // keep processing if line has timestamps even if only tags

    // Collect all timestamp matches with their position
    const matches: { mins: number; secs: number; index: number; raw: string }[] = [];
    lineRegex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = lineRegex.exec(rawLine)) !== null) {
      const mins = parseInt(m[1], 10);
      const secs = parseFloat(m[2]);
      if (isNaN(mins) || isNaN(secs)) continue;
      matches.push({ mins, secs, index: m.index, raw: m[0] });
    }
    if (matches.length === 0) return;

    // For each timestamp, grab the text until the next timestamp (or end of line)
    matches.forEach((tag, i) => {
      const start = tag.index + tag.raw.length;
      const end = i + 1 < matches.length ? matches[i + 1].index : rawLine.length;
      let segment = rawLine.slice(start, end).trim();
      // Remove word-level tags <...>
      segment = segment.replace(/<\d+(?::\d+(?:\.\d+)?)?>/g, '').trim();
      // KEEP EMPTY SEGMENTS - they represent instrumental breaks
      entries.push({
        time: Number((tag.mins * 60 + tag.secs).toFixed(2)),
        text: segment,
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

// Generate LRC string from lines and timestamps
export const generateLrc = (lines: string[], timestamps: (number | null)[]): string => {
  return lines
    .map((line, i) => {
      const time = timestamps[i];
      if (time === null) return null;
      const mins = Math.floor(time / 60).toString().padStart(2, '0');
      const secs = (time % 60).toFixed(2).padStart(5, '0');
      return `[${mins}:${secs}] ${line}`;
    })
    .filter(Boolean)
    .join('\n');
};