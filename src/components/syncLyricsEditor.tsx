'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FaPlayCircle, FaPauseCircle, FaClock } from 'react-icons/fa';
import { parseLrcForEditing, matchLrcToPlainLines, formatTime, parseLrcTime } from '@/utils/lrc';

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

  const initialTimestamps = useMemo(() => {
    if(!existingLrc?.trim()) {
        return new Array(lines.length).fill(null);
    }
    const lrcEntries = parseLrcForEditing(existingLrc);
    return matchLrcToPlainLines(lines, lrcEntries);
  }, [existingLrc, lines]);

  const [timestamps, setTimestamps] = useState<(number | null)[]>(initialTimestamps);
  const [currentLine, setCurrentLine] = useState(() => {
    const firstUnstamped = initialTimestamps.findIndex(t => t === null);
    return firstUnstamped === -1 ? 0 : firstUnstamped;
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);


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
        if (editingIndex !== null) return;

        const handler = (e: KeyboardEvent) => {
        if (e.key === ' ') { e.preventDefault(); stampCurrent(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); goBack(); }
        if (e.key === 'ArrowDown') { e.preventDefault(); setCurrentLine(p => Math.min(lines.length - 1, p + 1)); }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [stampCurrent, goBack, editingIndex, lines.length]);

    useEffect(() => {
        if (!existingLrc || timestamps.every(t => t === null)) return;

        let closestIndex = 0;
        let minDiff = Infinity;

        timestamps.forEach((time, index) => {
            if (time === null) return;
            const diff = Math.abs(time - currentPosition);
            if (diff < minDiff) {
            minDiff = diff;
            closestIndex = index;
            }
        });

        setCurrentLine(closestIndex);

        // Ensure DOM is ready
        const timer = setTimeout(() => {
            containerRef.current?.children[closestIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            });
        }, 150);

        return () => clearTimeout(timer);
    }, []);

    //LRC Playback live follow 
    useEffect(() => {
        if (!existingLrc || editingIndex !== null) return;

        let targetIndex = 0;

        // Find the line that owns the current time
        for (let i = 0; i < timestamps.length; i++) {
            const time = timestamps[i];
            if (time === null) continue;

            const nextTime = timestamps[i + 1];

            // This line is active if:
            // - Its time has passed
            // - AND next line hasn't started yet (or doesn't exist)
            if (time <= currentPosition + 0.3 && (!nextTime || currentPosition < nextTime)) {
                targetIndex = i;
                break;
            }

            // If we passed a line, it was the last one
            if (time <= currentPosition) {
                targetIndex = i;
            }
        }

        if (targetIndex !== currentLine) {
            setCurrentLine(targetIndex);
            containerRef.current?.children[targetIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [currentPosition, timestamps, currentLine, existingLrc, editingIndex]);

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
          <span className="font-mono text-lg text-black">
            {Math.floor(currentPosition / 60)}:{(currentPosition % 60).toFixed(0).padStart(2, '0')}
          </span>
          <span className="text-gray-600">
            Space = Stamp • ↑ = Prev • ↓ = Next
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
              onClick={() => setCurrentLine(i)}
            >
              <div className="w-28 text-right font-mono text-sm">
                {time !== null ? (
                editingIndex === i ? (
                    <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            console.log('enter new input', editValue, lrc);
                            e.preventDefault();
                            const parsed = parseLrcTime(editValue);
                            if (!isNaN(parsed) && editingIndex !== null) {
                                setTimestamps(p => {
                                const n = [...p];
                                n[editingIndex] = Number(parsed.toFixed(2));
                                return n;
                            });
                        }
                        setEditingIndex(null);
                        }
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingIndex(null);
                        }
                    }}
                    onBlur={() => setEditingIndex(null)}
                    className="w-24 px-1 text-right font-mono text-sm border-2 border-yellow-500 rounded bg-white focus:outline-none text-black"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span
                    onClick={(e) => {
                        e.stopPropagation();
                        setEditingIndex(i);
                        setEditValue(formatTime(time));
                    }}
                    className="cursor-pointer hover:text-blue-700 hover:underline font-medium text-black"
                    title="Click to edit timestamp"
                    >
                    {formatTime(time)}
                    </span>
                )
                ) : (
                <span className="text-gray-400">[--:--.--]</span>
                )}
            </div>
              <div className="flex-1 font-medium text-lg text-black">{line}</div>
              <button
                onClick={(e) => {
                e.stopPropagation();
                setTimestamps(p => {
                    const n = [...p];
                    n[i] = Number(currentPosition.toFixed(2));
                    return n;
                });
                if (i === currentLine) {
                    setCurrentLine(Math.min(lines.length - 1, i + 1));
                }
                }}
                className={`text-xs px-3 py-1 rounded font-medium text-white transition ${
                time !== null
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <FaClock className="inline mr-1" />
                {time !== null ? 'Re-stamp' : 'Set Now'}
              </button>

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