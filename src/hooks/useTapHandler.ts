'use client';
import { useCallback, useRef } from 'react';

interface UseTapHandlerOptions {
  onTap: () => void;
  tapDelay?: number;
  preventDefault?: boolean;
}

/**
 * Hook to handle both click and touch events for mobile compatibility
 * Prevents 300ms delay on mobile devices and handles both mouse and touch interactions
 */
export function useTapHandler({ 
  onTap, 
  tapDelay = 300,
  preventDefault = true 
}: UseTapHandlerOptions) {
  const touchStartTimeRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartTimeRef.current = Date.now();
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - touchStartTimeRef.current;
    
    // Check if it was a tap (not a long press or scroll)
    if (touchDuration < tapDelay && touchStartPosRef.current) {
      const touch = e.changedTouches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
      
      // Check if finger didn't move much (not a scroll/swipe)
      if (deltaX < 10 && deltaY < 10) {
        if (preventDefault) {
          e.preventDefault();
        }
        onTap();
      }
    }
    
    touchStartPosRef.current = null;
  }, [onTap, tapDelay, preventDefault]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Only handle click if it's not from a touch event
    // (touch events will trigger both touch and click on mobile)
    if (e.detail !== 0) {
      onTap();
    }
  }, [onTap]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onClick: handleClick,
  };
}
