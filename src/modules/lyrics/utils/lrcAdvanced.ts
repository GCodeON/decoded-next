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

    // Find all line-level timestamps AND their positions
    const timestampMatches = Array.from(raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g))
      .map(m => ({
        time: parseInt(m[1], 10) * 60 + parseFloat(m[2]),
        index: m.index,
        raw: m[0],
      }));

    if (timestampMatches.length === 0) continue;

    // When multiple timestamps appear on ONE line (malformed format), 
    // split into separate lines by extracting text between each timestamp pair
    if (timestampMatches.length > 1) {
      for (let i = 0; i < timestampMatches.length; i++) {
        const currentMatch = timestampMatches[i];
        const nextMatchIndex = i + 1 < timestampMatches.length 
          ? timestampMatches[i + 1].index 
          : raw.length;
        
        const textStart = currentMatch.index + currentMatch.raw.length;
        const textEnd = nextMatchIndex;
        let segmentText = raw.slice(textStart, textEnd).trim();
        
        // Remove word-level tags
        segmentText = segmentText.replace(/<\d+(?::\d+(?:\.\d+)?)?>/g, '').trim();
        
        if (!segmentText) continue; // Skip empty lines
        
        const line: TimedLine = {
          lineTime: Number(currentMatch.time.toFixed(2)),
          text: segmentText,
          words: [], // No word-level timing in malformed format
        };
        lines.push(line);
      }
      continue; // Move to next raw line
    }

    // Single timestamp on line: normal processing
    const lineTime = timestampMatches[0].time;
    let rest = raw;
    for (const m of timestampMatches) {
      rest = rest.replace(m.raw, '');
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

      // Trim and split captured text to handle spacing between tags
      const parts = wordText.trim().split(/\s+/);
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
          ? timedWords[timedIdx].time ?? Number(lineTime.toFixed(3))
          : Number(lineTime.toFixed(3));
        words.push({ text: wordText, time: fallbackTime });
        if (timedIdx < timedWords.length && wordText === timedWords[timedIdx].text) timedIdx++;
        continue;
      }

      const wordStart = searchPos + foundIdx;
      const wordEnd = wordStart + wordText.length;

      const timedMatch = timedIdx < timedWords.length && wordText === timedWords[timedIdx].text;
      const wordTime = timedMatch
        ? (timedWords[timedIdx].time ?? Number(lineTime.toFixed(3)))
        : Number(lineTime.toFixed(3));

      words.push({ text: wordText, time: wordTime, start: wordStart, end: wordEnd });
      if (timedMatch) timedIdx++;
      searchPos = wordEnd;
    }

    const line: TimedLine = {
      lineTime: Number(lineTime.toFixed(2)),
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
        
        // Add space after word tag if next character is a space
        if (pos < lineText.length && lineText[pos] === ' ') {
          built += ' ';
          pos++;
        }
      }
      built += lineText.slice(pos);
      lrcLine += built;
    }

    result.push(lrcLine);
  });

  return result.join('\n');
}

export function sanitizeEnhancedLrcOutput(content: string | null | undefined): string | null {
  if (!content?.trim()) return null;

  const parsed = parseEnhancedLrc(content);
  if (parsed.lines.length === 0) return null;

  const plainLines = parsed.lines.map((line) => line.text);
  const lineTimestamps = parsed.lines.map((line) => line.lineTime);
  const wordTimestamps = new Map<number, Word[]>();

  parsed.lines.forEach((line, index) => {
    if (line.words.length > 0) {
      wordTimestamps.set(index, line.words);
    }
  });

  return generateEnhancedLrc(plainLines, lineTimestamps, wordTimestamps);
}

// ──────────────────────────────────────────────────────────────
// 3. Helper: Get active word index for a line at given time
// ──────────────────────────────────────────────────────────────
export function getActiveWordIndex(words: Word[], currentTime: number): number | null {
  if (words.length === 0) return null;

  let low = 0;
  let high = words.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    const midTime = words[mid]?.time;

    if (typeof midTime !== 'number') {
      break;
    }

    if (midTime <= currentTime) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (result >= 0) {
    return result;
  }

  for (let i = words.length - 1; i >= 0; i--) {
    const wordTime = words[i]?.time;
    if (typeof wordTime === 'number' && currentTime >= wordTime) {
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
