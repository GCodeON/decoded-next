'use client';
import { useEffect, useRef, useMemo, useState } from 'react';
import { SyncedLine, SyncedTrack } from '@/features/lyrics/types/track';
import { FaPalette } from 'react-icons/fa';

export default function SyncedLyrics({
  syncedLyrics,
  currentPosition,
  isPlaying,
  rhymeEncodedLines
}: SyncedTrack ) {
  const containerRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<SyncedLine[]>([]);
  const [showRhymes, setShowRhymes] = useState(true);

  const lines = useMemo(() => {
    return syncedLyrics
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && /^\[/.test(line))
      .map((line, index) => {
        const m = line.match(/\[(\d+):(\d+\.\d+|\d+)\](.*)/);
        if (!m) return null;
        const [, mins, secs, txt] = m;
        const time = parseInt(mins) * 60 + parseFloat(secs);
        return { 
          time, 
          text: txt.trim(),
          rhymeHtml: rhymeEncodedLines?.[index],
          element: null as HTMLDivElement | null 
        };
      })
      .filter(Boolean) as SyncedLine[];
  }, [syncedLyrics, rhymeEncodedLines]);

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
    <>
      {/* Toggle Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowRhymes(!showRhymes)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all shadow-md ${
            showRhymes
              ? 'bg-gradient-to-r from-green-100 to-white-500 text-black'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <FaPalette className={showRhymes ? 'animate-pulse' : ''} />
          {showRhymes ? 'Rhymes ON' : 'Show Rhyme Colors'}
        </button>
      </div>
      {/* Lyrics Container */}
      <div
        ref={containerRef}
        className="max-h-96 overflow-y-auto bg-gray-50 rounded-xl py-5 md:space-y-2 scrollbar-thin scrollbar-thumb-gray-400"
      >
        {lines.map((line, i) => {
          const isActive = isPlaying && linesRef.current[i]?.element?.classList.contains('active');

          return (
            <div
              key={i}
              className="synced-line px-4 py-2 rounded-lg bg-white shadow-sm transition-all duration-200 text-black text-md md:text-xl font-medium"
            >
              {showRhymes && line.rhymeHtml ? (
                <div dangerouslySetInnerHTML={{ __html: line.rhymeHtml }} />
              ) : (
                <span>{line.text}</span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}