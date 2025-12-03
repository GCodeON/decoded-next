export interface Word {
  text: string;
  time: number;  // seconds, 3 decimals
  start?: number;
  end?:  number;
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

    const wordMatches = Array.from(rest.matchAll(/<((?:\d+:)?\d+(?:\.\d+)?)>([^<]+)/g));
    for (const wm of wordMatches) {
      const timeStr = wm[1];
      const word = wm[2];

      const time = timeStr.includes(':')
        ? (parseInt(timeStr.split(':')[0]) * 60 + parseFloat(timeStr.split(':')[1]))
        : parseFloat(timeStr);

      words.push({ text: word, time: Number(time.toFixed(3)) });
      cleanText = cleanText.replace(wm[0], word);
    }

    const line: TimedLine = {
      lineTime: lineTimes[0],
      text: cleanText.trim(),
      words: words.length > 0 ? words : [],
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
        // Skip undefined or invalid words
        if (!w || !w.text || typeof w.time !== 'number') {
          continue;
        }
        
        // Add text before this word (spaces, punctuation)
        const wordStart = lineText.indexOf(w.text, pos);
        if (wordStart === -1) {
          // Word not found, skip
          continue;
        }
        const prefix = lineText.slice(pos, wordStart);
        built += prefix;

        // Add timed word
        const wm = Math.floor(w.time / 60).toString().padStart(2, '0');
        const ws = (w.time % 60).toFixed(2).padStart(5, '0');
        built += `<${wm}:${ws}>${w.text}`;
        pos = wordStart + w.text.length;
      }
      // Add remaining text after last word
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
    const wordStart = lineText.indexOf(word.text, pos);
    if (wordStart === -1) continue;

    // Add prefix (spaces, punctuation) as non-word segment
    if (wordStart > pos) {
      segments.push({
        text: lineText.slice(pos, wordStart),
        time: null,
        isWord: false
      });
    }

    // Add word segment
    segments.push({
      text: word.text,
      time: word.time,
      isWord: true
    });

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
