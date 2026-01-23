'use client';
import { useEffect, useRef, useState } from 'react';

interface UsePageScrollOptions {
  activeLineIndex: number | null;
  lyricsContainerId: string;
  viewportOffset?: {
    mobile?: number;
    desktop?: number;
  } | number;
}

export function usePageScroll({
  activeLineIndex,
  lyricsContainerId,
  viewportOffset = 50,
}: UsePageScrollOptions) {
  const scrollAnimationRef = useRef<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Determine offset based on screen size
  const getViewportOffset = () => {
    if (typeof viewportOffset === 'number') {
      return viewportOffset;
    }
    return isMobile
      ? viewportOffset.mobile ?? 50
      : viewportOffset.desktop ?? 66;
  };

  // Detect mobile on mount and on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // 768px = Tailwind's md breakpoint
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    const currentOffset = getViewportOffset();
    const targetPosition = lineRect.top - (viewportHeight * currentOffset / 100);
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
  }, [activeLineIndex, lyricsContainerId, isMobile]);
}
