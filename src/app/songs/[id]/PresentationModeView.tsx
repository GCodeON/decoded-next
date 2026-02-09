'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaCompress } from 'react-icons/fa';
import { SyncedLyrics } from '@/modules/lyrics';

interface PresentationModeViewProps {
  scrollContainerId?: string;
  syncConfig: {
    lyrics: string;
    mode: 'word' | 'line';
    rhymeEncodedLines?: string[];
  } | null;
  displayHtml: string;
  hasSynced: boolean;
  currentPositionMs: number;
  isPlaying: boolean;
  showRhymes: boolean;
  isAuthenticated: boolean;
  onExit: () => void;
  onLineClick?: (timeMs: number) => void;
}

export default function PresentationModeView({
  scrollContainerId = 'content-scroll-container',
  syncConfig,
  displayHtml,
  hasSynced,
  currentPositionMs,
  isPlaying,
  showRhymes,
  isAuthenticated,
  onExit,
  onLineClick,
}: PresentationModeViewProps) {
  const [presentationSpeed, setPresentationSpeed] = useState(10);
  const [showPresentationControls, setShowPresentationControls] = useState(true);
  const [isPresentationPaused, setIsPresentationPaused] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [controlsHidden, setControlsHidden] = useState(false);
  const presentationControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presentationPauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const followAnimationRef = useRef<number | null>(null);
  const programmaticUntilRef = useRef(0);

  const showControlsTemporarily = useCallback(() => {
    if (controlsHidden) return;
    setShowPresentationControls(true);
    if (presentationControlsTimeoutRef.current) {
      clearTimeout(presentationControlsTimeoutRef.current);
    }
    presentationControlsTimeoutRef.current = setTimeout(() => {
      setShowPresentationControls(false);
    }, 2000);
  }, [controlsHidden]);

  const pausePresentationAutoScroll = useCallback(() => {
    setIsPresentationPaused(true);
    if (presentationPauseTimeoutRef.current) {
      clearTimeout(presentationPauseTimeoutRef.current);
    }
    presentationPauseTimeoutRef.current = setTimeout(() => {
      setIsPresentationPaused(false);
    }, 2000);
  }, []);

  useEffect(() => {
    if (isPresentationPaused) return;

    const scrollContainer = document.getElementById(scrollContainerId);
    if (!scrollContainer) return;

    let lastTime = performance.now();
    const upperRatio = 0.4;
    const lowerRatio = 0.6;
    const targetRatio = 0.5;
    const correctionSpeed = presentationSpeed * 3;
    const slowFactor = 0.4;

    const step = (time: number) => {
      const deltaSec = (time - lastTime) / 1000;
      lastTime = time;

      let adjust = 0;
      let baseSpeed = presentationSpeed;
      const lyricsContainer = document.getElementById('synced-lyrics-container');
      if (lyricsContainer && activeLineIndex !== null) {
        const activeLineEl = lyricsContainer.children[activeLineIndex] as HTMLElement | undefined;
        if (activeLineEl) {
          const lineRect = activeLineEl.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          const relativeTop = lineRect.top - containerRect.top + scrollContainer.scrollTop;
          const lineCenter = relativeTop + activeLineEl.offsetHeight / 2;

          const upperBound = scrollContainer.scrollTop + scrollContainer.clientHeight * upperRatio;
          const lowerBound = scrollContainer.scrollTop + scrollContainer.clientHeight * lowerRatio;
          const targetCenter = scrollContainer.scrollTop + scrollContainer.clientHeight * targetRatio;

          const error = lineCenter - targetCenter;
          const maxOutOfView = scrollContainer.clientHeight * 0.3;

          if (Math.abs(error) > maxOutOfView) {
            const targetScrollTop = lineCenter - scrollContainer.clientHeight * targetRatio;
            const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight;
            const clampedTarget = Math.max(0, Math.min(maxScrollTop, targetScrollTop));
            const clampDelta = clampedTarget - scrollContainer.scrollTop;
            const maxClampStep = 18;
            scrollContainer.scrollTop += Math.sign(clampDelta) * Math.min(Math.abs(clampDelta), maxClampStep);
          } else if (lineCenter <= upperBound) {
            baseSpeed = presentationSpeed * slowFactor;
            adjust = Math.sign(error) * correctionSpeed * deltaSec;
          } else if (lineCenter >= lowerBound) {
            baseSpeed = presentationSpeed * slowFactor;
            adjust = Math.sign(error) * correctionSpeed * deltaSec;
          } else if (lineCenter < upperBound || lineCenter > lowerBound) {
            adjust = Math.sign(error) * correctionSpeed * deltaSec;
          }
        }
      }

      const base = baseSpeed * deltaSec;
      const nextScrollTop = scrollContainer.scrollTop + base + adjust;
      const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      if (maxScrollTop > 0) {
        const clamped = Math.max(0, Math.min(maxScrollTop, nextScrollTop));
        if (clamped !== scrollContainer.scrollTop) {
          programmaticUntilRef.current = performance.now() + 80;
          scrollContainer.scrollTop = clamped;
        }
      }

      followAnimationRef.current = requestAnimationFrame(step);
    };

    followAnimationRef.current = requestAnimationFrame(step);
    return () => {
      if (followAnimationRef.current) {
        cancelAnimationFrame(followAnimationRef.current);
      }
    };
  }, [activeLineIndex, isPresentationPaused, presentationSpeed, scrollContainerId]);

  useEffect(() => {
    const scrollContainer = document.getElementById(scrollContainerId);
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (performance.now() < programmaticUntilRef.current) return;
      pausePresentationAutoScroll();
      showControlsTemporarily();
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollContainerId, pausePresentationAutoScroll, showControlsTemporarily]);

  useEffect(() => {
    showControlsTemporarily();
    return () => {
      if (presentationControlsTimeoutRef.current) {
        clearTimeout(presentationControlsTimeoutRef.current);
      }
      if (presentationPauseTimeoutRef.current) {
        clearTimeout(presentationPauseTimeoutRef.current);
      }
    };
  }, [showControlsTemporarily]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);


  return (
    <div className="relative w-screen h-[100dvh] bg-black">
      <div
        className="h-full"
        onClick={() => {
          pausePresentationAutoScroll();
          setControlsHidden(false);
          showControlsTemporarily();
        }}
        onTouchStart={() => {
          pausePresentationAutoScroll();
          setControlsHidden(false);
          showControlsTemporarily();
        }}
        onMouseMove={showControlsTemporarily}
      >
        <div className="mx-auto w-full  px-4">
          {syncConfig && (
            <div className="relative pt-0">
              {!controlsHidden && (
                <div className="sticky top-5 right-3 z-20 flex justify-end">
                  <button
                    type="button"
                    aria-label="Exit presentation mode"
                    onClick={onExit}
                    className="rounded-full border border-white/20 bg-black/70 p-2 text-white shadow-lg transition hover:bg-black/80 cursor-pointer"
                  >
                    <FaCompress />
                  </button>
                </div>
              )}
              <SyncedLyrics
                syncedLyrics={syncConfig.lyrics}
                currentPositionMs={currentPositionMs}
                isPlaying={isPlaying}
                rhymeEncodedLines={syncConfig.rhymeEncodedLines}
                showRhymes={showRhymes}
                mode={syncConfig.mode}
                containerId="synced-lyrics-container"
                isAuthenticated={isAuthenticated}
                onActiveLineChange={setActiveLineIndex}
                onLineClick={onLineClick}
              />
            </div>
          )}

          {!hasSynced && displayHtml && (
            <div className="prose prose-lg max-w-none">
              <div
                className="whitespace-pre-wrap break-words font-sans text-gray-700 leading-relaxed text-lg md:text-xl text-white dark:text-gray-300 bg-white dark:bg-gray-900 p-4 rounded"
                dangerouslySetInnerHTML={{ __html: displayHtml }}
              />
            </div>
          )}
        </div>
      </div>

      <div
        className={`fixed bottom-6 right-6 bg-black/70 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 transition-opacity duration-200 ${
          showPresentationControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <label className="text-xs uppercase tracking-wide text-gray-300">Scroll speed</label>
        <input
          type="range"
          min={10}
          max={60}
          step={1}
          value={presentationSpeed}
          onChange={(event) => {
            setPresentationSpeed(Number(event.target.value));
            setIsPresentationPaused(false);
            if (presentationPauseTimeoutRef.current) {
              clearTimeout(presentationPauseTimeoutRef.current);
            }
            showControlsTemporarily();
          }}
          className="w-36 md:w-48 accent-white"
        />
        <span className="text-xs text-gray-300 tabular-nums">{presentationSpeed} px/s</span>
        <button
          type="button"
          className="text-xs text-gray-300 hover:text-white transition"
          onClick={() => {
            setControlsHidden(true);
            setShowPresentationControls(false);
          }}
        >
          Hide
        </button>
      </div>
    </div>
  );
}
