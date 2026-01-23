'use client';
import { useEffect, useRef, useState } from 'react';

interface UsePageScrollOptions {
  activeLineIndex: number | null;
  lyricsContainerId: string;
  scrollContainerId?: string;
  viewportOffset?: {
    mobile?: number;
    desktop?: number;
  } | number;
}

export function usePageScroll({
  activeLineIndex,
  lyricsContainerId,
  scrollContainerId = 'content-scroll-container',
  viewportOffset = 50,
}: UsePageScrollOptions) {
  const scrollAnimationRef = useRef<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const getViewportOffset = () => {
    if (typeof viewportOffset === 'number') {
      return viewportOffset;
    }
    return isMobile
      ? viewportOffset.mobile ?? 50
      : viewportOffset.desktop ?? 66;
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (activeLineIndex === null) return;

    const lyricsContainer = document.getElementById(lyricsContainerId);
    const scrollContainer = document.getElementById(scrollContainerId);
    
    if (!lyricsContainer || !scrollContainer) return;

    const activeLineEl = lyricsContainer.children[activeLineIndex] as HTMLElement;
    if (!activeLineEl) return;

    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
    }

    // Calculate position relative to scroll container
    const lineRect = activeLineEl.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const relativeTop = lineRect.top - containerRect.top + scrollContainer.scrollTop;
    
    const scrollHeight = scrollContainer.clientHeight;
    const currentOffset = getViewportOffset();
    const targetScroll = relativeTop - (scrollHeight * currentOffset / 100);
    const currentScroll = scrollContainer.scrollTop;
    const distance = targetScroll - currentScroll;

    const duration = 300;
    const startTime = Date.now();

    const animateScroll = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

      scrollContainer.scrollTop = currentScroll + distance * easeProgress;

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
  }, [activeLineIndex, lyricsContainerId, scrollContainerId, isMobile]);
}
