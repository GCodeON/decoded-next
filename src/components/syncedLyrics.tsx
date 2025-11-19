'use client';
import { useEffect, useRef, useMemo } from 'react';
import { SyncedLine } from '@/types/track';

export default function SyncedLyrics({
  syncedLyrics,
  currentPosition,
  isPlaying,
}: {
  syncedLyrics: string;
  currentPosition: number;
  isPlaying: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<SyncedLine[]>([]);

  const lines = useMemo(() => {
    return syncedLyrics
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && /^\[/.test(line))
      .map((line) => {
        const m = line.match(/\[(\d+):(\d+\.\d+|\d+)\](.*)/);
        if (!m) return null;
        const [, mins, secs, txt] = m;
        const time = parseInt(mins) * 60 + parseFloat(secs);
        return { time, text: txt.trim(), element: null as HTMLDivElement | null };
      })
      .filter(Boolean) as SyncedLine[];
  }, [syncedLyrics]);

  // Update DOM references
  useEffect(() => {
    linesRef.current = lines;
    requestAnimationFrame(() => {
      const els = containerRef.current?.querySelectorAll('.synced-line');
      els?.forEach((el, i) => {
        if (lines[i]) lines[i].element = el as HTMLDivElement;
      });
    });
  }, [lines]);

  // Scroll to active line
  useEffect(() => {
    if (!isPlaying || linesRef.current.length === 0) return;

    const active = linesRef.current.filter((l) => currentPosition >= l.time).pop();
    if (!active?.element) return;

    const container = containerRef.current!;
    const line = active.element;

    // Highlight
    container.querySelectorAll('.synced-line').forEach((el) => {
      el.classList.toggle('active', el === line);
    });

    // Smooth scroll
    const containerRect = container.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const lineCenterY = lineRect.top - containerRect.top + container.scrollTop + lineRect.height / 2;
    const targetScrollTop = lineCenterY - container.clientHeight / 2;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));

    if (Math.abs(container.scrollTop - finalScrollTop) > 5) {
      container.scrollTo({ top: finalScrollTop, behavior: 'smooth' });
    }
  }, [currentPosition, isPlaying]);

  return (
    <div
      ref={containerRef}
      className="max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-4 space-y-3"
    >
      {lines.map((line, i) => (
        <div
          key={i}
          className="synced-line px-4 py-2 rounded-lg bg-white shadow-sm transition-all duration-300 text-black text-lg font-medium"
        >
          {line.text}
        </div>
      ))}
    </div>
  );
}