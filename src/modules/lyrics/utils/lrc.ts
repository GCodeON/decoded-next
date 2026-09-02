export const mstoSeconds = (ms: number): number => {
  return Math.max(0, Math.round(ms / 1000));
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
    if (!rawLine) return; 

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

    matches.forEach((tag, i) => {
      const start = tag.index + tag.raw.length;
      const end = i + 1 < matches.length ? matches[i + 1].index : rawLine.length;
      let segment = rawLine.slice(start, end).trim();
      // Remove word-level tags <...>
      segment = segment.replace(/<\d+(?::\d+(?:\.\d+)?)?>/g, '').trim();
      if (!segment || /^Set Now$/i.test(segment) || /^\[\s*--:\s*--\.\s*--\s*\]$/i.test(segment)) {
        return;
      }
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

  if (lrcEntries.length === 0) return result;

  const normalize = (s: string) =>
    s.replace(/[.,!?…"'’()–—-]/g, '').replace(/\s+/g, ' ').toLowerCase().trim();

  const isSafeMatch = (plain: string, entryText: string): boolean => {
    const plainNorm = normalize(plain);
    const entryNorm = normalize(entryText);

    if (!plainNorm || !entryNorm) return false;
    if (plainNorm === entryNorm) return true;

    // Only allow near-equality for very short, intentionally equivalent lines.
    const lengthRatio = Math.max(plainNorm.length, entryNorm.length) / Math.min(plainNorm.length, entryNorm.length);
    if (lengthRatio <= 1.2 && plainNorm.slice(0, Math.min(plainNorm.length, entryNorm.length)) === entryNorm.slice(0, Math.min(plainNorm.length, entryNorm.length))) {
      return true;
    }

    return false;
  };

  let entryIndex = 0;
  for (let lineIndex = 0; lineIndex < plainLines.length && entryIndex < lrcEntries.length; lineIndex++) {
    const plain = plainLines[lineIndex];
    const entry = lrcEntries[entryIndex];

    if (isSafeMatch(plain, entry.text)) {
      result[lineIndex] = Number(entry.time.toFixed(2));
      entryIndex++;
      continue;
    }

    // An earlier edit can split one visual line into timestamped fragments.
    // Rejoin only consecutive fragments that exactly recover the canonical line.
    let combinedText = entry.text;
    for (let endIndex = entryIndex + 1; endIndex < lrcEntries.length; endIndex++) {
      combinedText = `${combinedText} ${lrcEntries[endIndex].text}`;
      if (normalize(combinedText) === normalize(plain)) {
        result[lineIndex] = Number(entry.time.toFixed(2));
        entryIndex = endIndex + 1;
        break;
      }
    }
  }

  // If the plain line count is larger than the synced entry count, keep the remaining ones null
  // rather than reusing earlier timestamps for partial fragments.
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

export const isLikelySynced = (lrc?: string) => {
  if (!lrc) return false;
  const lines = lrc.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return false;
  const timestampRe = /^\[\d{2}:\d{2}(?:\.\d{2})?]/;
  return lines.every((ln) => !ln.trim() || timestampRe.test(ln));
};

export const isFullyStamped = (lrc: string): boolean => {
  const timestampRegex = /^\[\d{2}:\d{2}(?:\.\d{2})?]/;
  return lrc
    .split(/\r?\n/)
    .filter(Boolean)
    .every((line) => !line.trim() || timestampRegex.test(line));
};

/**
 * Sanitize LRC output by removing placeholder rows and regenerating clean LRC.
 * This ensures malformed editor placeholders like "[--:--.--]" and "Set Now" 
 * are never persisted to the database.
 */
export const sanitizeLrcOutput = (lrc: string | null | undefined): string | null => {
  if (!lrc?.trim()) return null;
  const parsed = parseLrcForEditing(lrc);
  if (parsed.length === 0) return null;
  return generateLrc(parsed.map(e => e.text), parsed.map(e => e.time));
};