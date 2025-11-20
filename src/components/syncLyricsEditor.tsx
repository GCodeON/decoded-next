'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FaPlayCircle, FaPauseCircle, FaClock } from 'react-icons/fa';

interface Props {
  plainLyrics: string;
  existingLrc?: string | null;
  currentPosition: number;
  isPlaying: boolean;
  togglePlayback: () => void;
  onSave: (lrc: string) => void;
  onCancel: () => void;
}

export default function SyncLyricsEditor({ plainLyrics, existingLrc, currentPosition, isPlaying,togglePlayback, onSave, onCancel }: Props) {

  const lines = useMemo(() => {
    return plainLyrics
    .split('\n')
    .map(l => l.trim())
    .filter(line => line.length > 0);
  }, [plainLyrics]);

  console.log('existing LRC', existingLrc);

  const initialTimestamps = useMemo(() => {
    const result = new Array(lines.length).fill(null) as (number | null)[];

    if (!existingLrc || !existingLrc.trim()) return result;

    const lrcEntries: { time: number; text: string }[] = [];

    existingLrc.split('\n').forEach(lrcLine => {
        const match = lrcLine.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
        if (!match) return;

        const mins = parseInt(match[1], 10);
        const secs = parseFloat(match[2]);
        const text = match[3].trim();

        if (isNaN(mins) || isNaN(secs)) return;

        lrcEntries.push({ time: mins * 60 + secs, text });
    });

    // Sort by time (critical for out-of-order files)
    lrcEntries.sort((a, b) => a.time - b.time);

    // Match in chronological order
    let lrcIndex = 0;
    for (let lineIndex = 0; lineIndex < lines.length && lrcIndex < lrcEntries.length; lineIndex++) {
        const plainLine = lines[lineIndex];
        const lrcEntry = lrcEntries[lrcIndex];

        // Normalize for comparison
        const cleanPlain = plainLine.replace(/[,.'"!()]/g, '').toLowerCase();
        const cleanLrc = lrcEntry.text.replace(/[,.'"!()]/g, '').toLowerCase();

        // Match if text is identical (case + punctuation tolerant)
        if (cleanPlain === cleanLrc || plainLine === lrcEntry.text) {
            result[lineIndex] = Number(lrcEntry.time.toFixed(2));
            lrcIndex++;
        }
        // If not match → skip this plain line (could be instrumental or missing)
    }

    return result;
  }, [existingLrc, lines]);

  const [timestamps, setTimestamps] = useState<(number | null)[]>(initialTimestamps);
  const [currentLine, setCurrentLine] = useState(() => {
    const firstUnstamped = initialTimestamps.findIndex(t => t === null);
    return firstUnstamped === -1 ? 0 : firstUnstamped;
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimestamps(initialTimestamps);
    const firstNull = initialTimestamps.findIndex(t => t === null);
    setCurrentLine(firstNull === -1 ? 0 : firstNull);
  }, [initialTimestamps]);

  const stampCurrent = useCallback(() => {
    setTimestamps(prev => {
      const next = [...prev];
      next[currentLine] = Number(currentPosition.toFixed(2));
      return next;
    });
    setCurrentLine(prev => Math.min(lines.length - 1, prev + 1));
  }, [currentLine, currentPosition, lines.length]);

  const goBack = useCallback(() => {
    setCurrentLine(prev => Math.max(0, prev - 1));
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toFixed(2).padStart(5, '0');
    return `[${m}:${s}]`;
  };

    const lrc = useMemo(() => {
    return lines
        .map((line, i) => {
        const time = timestamps[i];
        if (time === null) return null;
        const mins = Math.floor(time / 60).toString().padStart(2, '0');
        const secs = (time % 60).toFixed(2).padStart(5, '0');
        return `[${mins}:${secs}]${line}`;
        })
        .filter(Boolean)
        .join('\n');
    }, [lines, timestamps]);

  const allStamped = timestamps.every(t => t !== null);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); stampCurrent(); }
      if (e.key === 'Backspace' || e.key === 'ArrowUp') { e.preventDefault(); goBack(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setCurrentLine(p => Math.min(lines.length - 1, p + 1)); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [stampCurrent, goBack]);

  // Auto-scroll
  useEffect(() => {
    containerRef.current?.children[currentLine]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentLine]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-bold text-black">Sync Lyrics to Music</h3>
        <div className="flex items-center gap-4 text-sm">
          <button onClick={togglePlayback} className="text-green-600 hover:scale-110 transition">
            {isPlaying ? <FaPauseCircle size={28} /> : <FaPlayCircle size={28} />}
          </button>
          <span className="font-mono text-lg text-green">
            {Math.floor(currentPosition / 60)}:{(currentPosition % 60).toFixed(0).padStart(2, '0')}
          </span>
          <span className="text-gray-600">
            Space = Stamp • Backspace/↑ = Prev • ↓ = Next
          </span>
        </div>
      </div>

      <div ref={containerRef} className="max-h-96 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg border">
        {lines.map((line, i) => {
          const time = timestamps[i];
          const isActive = i === currentLine;
          return (
            <div
              key={i}
              className={`flex gap-4 p-4 rounded-lg border-2 transition-all ${
                isActive
                  ? 'bg-yellow-100 border-yellow-500 shadow-xl'
                  : time !== null
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white border-gray-300'
              }`}
            >
              <div className="w-28 text-right font-mono text-sm text-gray-500">
                {time !== null ? formatTime(time) : '[--:--.--]'}
              </div>
              <div className="flex-1 font-medium text-lg text-black">{line}</div>
              {time === null && (
                <button
                onClick={() => {
                    setTimestamps(p => {
                    const n = [...p];
                    n[i] = Number(currentPosition.toFixed(2));
                    return n;
                    });
                    if (i === currentLine) {
                    setCurrentLine(Math.min(lines.length - 1, i + 1));
                    }
                }}
                className={`text-xs px-3 py-1 rounded ${time !== null ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                >
                <FaClock className="inline mr-1" />
                {time !== null ? 'Re-stamp' : 'Set Now'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <button
          onClick={() => onSave(lrc)}
          disabled={!allStamped}
          className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          Save Synced Lyrics
        </button>
        <button onClick={onCancel} className="text-gray-600 hover:text-gray-900">
          Cancel
        </button>
      </div>

      {lrc && (
        <details className="mt-4">
          <summary className="cursor-pointer font-medium text-gray-700">Preview LRC Output</summary>
          <pre className="mt-3 p-4 bg-gray-900 text-gray-300 text-xs font-mono rounded overflow-x-auto">
            {lrc}
          </pre>
        </details>
      )}
    </div>
  );
}