'use client';
import { useEffect, useRef } from 'react';

interface UsePageScrollOptions {
  activeLineIndex: number | null;
  lyricsContainerId: string;
  viewportOffset?: number;
}

export function usePageScroll({
  activeLineIndex,
  lyricsContainerId,
  viewportOffset = 50,
}: UsePageScrollOptions) {
  const scrollAnimationRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeLineIndex === null) return;

    const container = document.getElementById(lyricsContainerId);
    if (!container) return;

    const activeLineEl = container.children[activeLineIndex] as HTMLElement;
    if (!activeLineEl) return;

    // Cancel any pending animation
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
    }

    // Calculate target scroll position
    const lineRect = activeLineEl.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const targetPosition = lineRect.top - (viewportHeight * viewportOffset / 100);
    const currentScroll = window.scrollY;
    const distance = targetPosition;

    const duration = 300; // milliseconds
    const startTime = Date.now();

    const animateScroll = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-in-out)
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      window.scrollBy({
        top: distance * easeProgress - (window.scrollY - currentScroll),
        behavior: 'auto',
      });

      if (progress < 1) {
        scrollAnimationRef.current = requestAnimationFrame(animateScroll);
      }
    };

    scrollAnimationRef.current = requestAnimationFrame(animateScroll);

    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, [activeLineIndex, lyricsContainerId, viewportOffset]);
}
