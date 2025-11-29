'use client'
import { useState, useCallback, useEffect } from 'react';
interface UseSyncNavigationOptions {
  totalLines: number;
  allStamped: boolean;
  onStamp: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function useSyncNavigation({
  totalLines,
  allStamped,
  onStamp,
  onBack,
  onNext
}: UseSyncNavigationOptions) {
  const [currentLine, setCurrentLine] = useState(0);
  const [manualNavigation, setManualNavigation] = useState(false);

  const goToLine = useCallback((index: number) => {
    setCurrentLine(Math.max(0, Math.min(totalLines - 1, index)));
    if (allStamped) {
      setManualNavigation(true);
    }
  }, [totalLines, allStamped]);

  const enableAutoScroll = useCallback(() => {
    setManualNavigation(false);
  }, []);

  const handleStamp = useCallback(() => {
    onStamp();
    setManualNavigation(true);
  }, [onStamp]);

  const handleBack = useCallback(() => {
    onBack();
    setManualNavigation(true);
  }, [onBack]);

  const handleNext = useCallback(() => {
    onNext();
    setManualNavigation(true);
  }, [onNext]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ') { 
        e.preventDefault(); 
        handleStamp(); 
      }
      if (e.key === 'ArrowUp') { 
        e.preventDefault(); 
        handleBack(); 
      }
      if (e.key === 'ArrowDown') { 
        e.preventDefault(); 
        handleNext(); 
      }
      if (e.key === 'Escape') { 
        e.preventDefault(); 
        enableAutoScroll(); 
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleStamp, handleBack, handleNext, enableAutoScroll]);

  return {
    currentLine,
    setCurrentLine,
    manualNavigation,
    goToLine,
    enableAutoScroll
  };
}
