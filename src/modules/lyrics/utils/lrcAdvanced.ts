export interface Word {
  text: string;
  time: number;  // seconds, 3 decimals
  start?: number;
  end?: number;
}

export interface TimedLine {
  lineTime: number;      // line-level timestamp
  text: string;          // full line text (without tags)
  words: Word[];         // empty if no word timing
}

export interface LrcFile {
  metadata: Record<string, string>;
  lines: TimedLine[];
}

const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ──────────────────────────────────────────────────────────────
// 1. Parse full enhanced LRC
// ──────────────────────────────────────────────────────────────
export function parseEnhancedLrc(content: string): LrcFile {
  const rawLines = content.split(/\r?\n/);
  const lines: TimedLine[] = [];
  const metadata: Record<string, string> = {};

  for (let raw of rawLines) {
    raw = raw.trim();
    if (!raw) continue;

    // Metadata tags
    const meta = raw.match(/^\[([a-zA-Z]+):(.+)]$/);
    if (meta) {
      metadata[meta[1].toLowerCase()] = meta[2].trim();
      continue;
    }

    // Find all line-level timestamps
    const lineTimes = Array.from(raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g))
      .map(m => {
        const mins = parseInt(m[1], 10);
        const secs = parseFloat(m[2]);
        return mins * 60 + secs;
      });

    if (lineTimes.length === 0) continue;

    // Remove all line-level tags to get the rest
    let rest = raw;
    for (const m of Array.from(raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g))) {
      rest = rest.replace(m[0], '');
    }

    // Parse word-level tags <ss.xx> or <mm:ss.xx>
    const words: Word[] = [];
    let cleanText = rest;

    // Collect timed words (and split multi-word entries)
    const timedWords: Array<{ text: string; time: number | null }> = [];
    const wordMatches = Array.from(rest.matchAll(/<((?:\d+:)?\d+(?:\.\d+)?)>([^<]+)/g));
    for (const wm of wordMatches) {
      const timeStr = wm[1];
      const wordText = wm[2];

      const time = timeStr.includes(':')
        ? (parseInt(timeStr.split(':')[0]) * 60 + parseFloat(timeStr.split(':')[1]))
        : parseFloat(timeStr);

      const parts = wordText.split(/\s+/);
      parts.forEach((part, idx) => {
        if (!part) return;
        timedWords.push({ text: part, time: idx === 0 ? Number(time.toFixed(3)) : null });
      });

      // Replace timed word tags with plain text to reconstruct the visible line
      cleanText = cleanText.replace(wm[0], wordText);
    }

    // Build full word list in order from the clean text
    const finalText = cleanText.trim();
    const allWords = finalText.split(/\s+/).filter(Boolean);

    // Walk words in order, assign times, and compute character ranges
    let timedIdx = 0;
    let searchPos = 0;

    for (const wordText of allWords) {
      // Locate this word in the remaining text using word boundaries when possible
      const searchText = finalText.slice(searchPos);
      const boundary = new RegExp(`\\b${escapeRegex(wordText)}\\b`);
      const relIdx = searchText.search(boundary);
      const foundIdx = relIdx >= 0 ? relIdx : searchText.indexOf(wordText);
      if (foundIdx < 0) {
        // If not found, still push with fallback timing
        const fallbackTime = timedIdx < timedWords.length && wordText === timedWords[timedIdx].text
          ? timedWords[timedIdx].time ?? Number(lineTimes[0].toFixed(3))
          : Number(lineTimes[0].toFixed(3));
        words.push({ text: wordText, time: fallbackTime });
        if (timedIdx < timedWords.length && wordText === timedWords[timedIdx].text) timedIdx++;
        continue;
      }

      const wordStart = searchPos + foundIdx;
      const wordEnd = wordStart + wordText.length;

      const timedMatch = timedIdx < timedWords.length && wordText === timedWords[timedIdx].text;
      const wordTime = timedMatch
        ? (timedWords[timedIdx].time ?? Number(lineTimes[0].toFixed(3)))
        : Number(lineTimes[0].toFixed(3));

      words.push({ text: wordText, time: wordTime, start: wordStart, end: wordEnd });
      if (timedMatch) timedIdx++;
      searchPos = wordEnd;
    }

    const line: TimedLine = {
      lineTime: lineTimes[0],
      text: finalText,
      words,
    };

    lines.push(line);
  }

  // Sort by line time (important!)
  lines.sort((a, b) => a.lineTime - b.lineTime);

  return { metadata, lines };
}

// ──────────────────────────────────────────────────────────────
// 2. Generate enhanced LRC from editor state
// ──────────────────────────────────────────────────────────────
export function generateEnhancedLrc(
  plainLines: string[],
  lineTimestamps: (number | null)[],
  wordTimestamps: Map<number, Word[]>   // lineIndex → word array (optional)
): string {
  const result: string[] = [];

  plainLines.forEach((lineText, i) => {
    const lineTime = lineTimestamps[i];
    if (lineTime === null) return;

    const mins = Math.floor(lineTime / 60).toString().padStart(2, '0');
    const secs = (lineTime % 60).toFixed(2).padStart(5, '0');

    let lrcLine = `[${mins}:${secs}]`;

    const words = wordTimestamps.get(i) || [];
    if (words.length === 0) {
      lrcLine += lineText;
    } else {
      let pos = 0;
      let built = '';
      for (const w of words) {
        if (!w || !w.text || typeof w.time !== 'number') continue;

        const searchText = lineText.slice(pos);
        const boundary = new RegExp(`\\b${escapeRegex(w.text)}\\b`);
        const relIdx = searchText.search(boundary);
        const foundIdx = relIdx >= 0 ? relIdx : searchText.indexOf(w.text);
        if (foundIdx < 0) continue;

        const wordStart = pos + foundIdx;
        built += lineText.slice(pos, wordStart);

        const wm = Math.floor(w.time / 60).toString().padStart(2, '0');
        const ws = (w.time % 60).toFixed(2).padStart(5, '0');
        built += `<${wm}:${ws}>${w.text}`;

        pos = wordStart + w.text.length;
      }
      built += lineText.slice(pos);
      lrcLine += built;
    }

    result.push(lrcLine);
  });

  return result.join('\n');
}

// ──────────────────────────────────────────────────────────────
// 3. Helper: Get active word index for a line at given time
// ──────────────────────────────────────────────────────────────
export function getActiveWordIndex(words: Word[], currentTime: number): number | null {
  if (words.length === 0) return null;
  
  for (let i = words.length - 1; i >= 0; i--) {
    if (currentTime >= words[i].time) {
      return i;
    }
  }
  
  return null;
}

// ──────────────────────────────────────────────────────────────
// 4. Helper: Split line text into word segments for rendering
// ──────────────────────────────────────────────────────────────
export interface WordSegment {
  text: string;
  time: number | null;
  isWord: boolean;
}

export function splitLineIntoSegments(lineText: string, words: Word[]): WordSegment[] {
  if (words.length === 0) {
    // No word timing, split by whitespace
    return lineText.split(/(\s+)/).map(text => ({
      text,
      time: null,
      isWord: text.trim().length > 0
    }));
  }

  const segments: WordSegment[] = [];
  let pos = 0;

  for (const word of words) {
    const searchText = lineText.slice(pos);
    const boundary = new RegExp(`\\b${escapeRegex(word.text)}\\b`);
    const relIdx = searchText.search(boundary);
    const foundIdx = relIdx >= 0 ? relIdx : searchText.indexOf(word.text);
    if (foundIdx < 0) continue;

    const wordStart = pos + foundIdx;

    if (wordStart > pos) {
      segments.push({ text: lineText.slice(pos, wordStart), time: null, isWord: false });
    }

    segments.push({ text: word.text, time: word.time, isWord: true });

    pos = wordStart + word.text.length;
  }

  // Add remaining text
  if (pos < lineText.length) {
    segments.push({
      text: lineText.slice(pos),
      time: null,
      isWord: false
    });
  }

  return segments;
}
