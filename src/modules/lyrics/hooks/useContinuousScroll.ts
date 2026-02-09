'use client';
import { useEffect, useRef } from 'react';

interface UseContinuousScrollOptions {
  scrollContainerId?: string;
  enabled: boolean;
  speedPxPerSec: number;
  paused?: boolean;
  onUserScroll?: () => void;
}

export function useContinuousScroll({
  scrollContainerId = 'content-scroll-container',
  enabled,
  speedPxPerSec,
  paused = false,
  onUserScroll,
}: UseContinuousScrollOptions) {
  const animationRef = useRef<number | null>(null);
  const programmaticUntilRef = useRef(0);

  useEffect(() => {
    if (!enabled || paused || speedPxPerSec <= 0) return;

    const scrollContainer = document.getElementById(scrollContainerId);
    if (!scrollContainer) return;

    let lastTime = performance.now();

    const step = (time: number) => {
      const deltaSec = (time - lastTime) / 1000;
      lastTime = time;

      const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      if (maxScrollTop > 0) {
        const nextScrollTop = Math.min(
          maxScrollTop,
          scrollContainer.scrollTop + speedPxPerSec * deltaSec
        );

        if (nextScrollTop !== scrollContainer.scrollTop) {
          programmaticUntilRef.current = performance.now() + 80;
          scrollContainer.scrollTop = nextScrollTop;
        }
      }

      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [scrollContainerId, enabled, paused, speedPxPerSec]);

  useEffect(() => {
    if (!enabled || !onUserScroll) return;

    const scrollContainer = document.getElementById(scrollContainerId);
    if (!scrollContainer) return;

    const handleScroll = () => {
      if (performance.now() < programmaticUntilRef.current) return;
      onUserScroll();
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollContainerId, enabled, onUserScroll]);
}
