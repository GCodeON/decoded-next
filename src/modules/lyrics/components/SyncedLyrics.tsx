'use client';
import { useRef, useEffect, useState } from 'react';
import { FaPalette } from 'react-icons/fa';
import { useLyricSync, SyncedTrack  } from '@/modules/lyrics';

export default function SyncedLyrics({
  syncedLyrics,
  currentPosition,
  isPlaying,
  rhymeEncodedLines
}: SyncedTrack ) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showRhymes, setShowRhymes] = useState(true);

  const { lines, activeLine } = useLyricSync({
    plainLyrics: '',
    existingLrc: syncedLyrics,
    currentPosition,
    isPlaying,
    autoScroll: true
  });

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLine === null) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const targetElement = Array.from(container.children)[activeLine] as HTMLElement | undefined;
    
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLine]);

  const htmlIsVisuallyEmpty = (html?: string): boolean => {
    if (!html) return true;
    const stripped = html
      .replace(/<br\s*\/?>/gi, '')
      .replace(/&nbsp;/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    return stripped.length === 0;
  };

  return (
    <>
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

      <div
        ref={containerRef}
        className="max-h-96 overflow-y-auto bg-gray-50 rounded-xl py-5 md:space-y-2 scrollbar-thin scrollbar-thumb-gray-400"
      >
        {lines.map((line, i) => {
          const isActive = i === activeLine;
          const lineText = line.trim();
          
          // For empty lines, always show as instrumental
          if (!lineText) {
            return (
              <div
                key={i}
                className={`synced-line px-4 py-2 rounded-lg shadow-sm transition-all duration-200 text-black text-md md:text-xl font-medium ${
                  isActive ? 'bg-yellow-100 scale-105' : 'bg-white'
                }`}
              >
                <span className="text-gray-400 italic">(instrumental)</span>
              </div>
            );
          }
          
          const rhymeHtml = rhymeEncodedLines?.[i];
          const showRhymeContent = showRhymes && rhymeHtml && !htmlIsVisuallyEmpty(rhymeHtml);

          return (
            <div
              key={i}
              className={`synced-line px-2 py-2 rounded-lg shadow-sm transition-all duration-200 text-black text-md md:text-xl font-medium ${
                isActive ? 'bg-yellow-100 scale-101' : 'bg-white'
              }`}
            >
              {showRhymeContent ? (
                <div dangerouslySetInnerHTML={{ __html: rhymeHtml }} />
              ) : (
                <span>{lineText}</span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}