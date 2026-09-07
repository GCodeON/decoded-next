'use client';

import React, { useMemo } from 'react';
import type { LyricalQuantification, BarMetric } from '../types/quantification';
import { vowels } from '../config/rhyme-colors';

interface LiterarySpectrogramProps {
  quantification: LyricalQuantification;
  currentPositionMs?: number;
  durationMs?: number;
  selectedVowel?: string | null;
  onSelectVowel?: (vowel: string | null) => void;
  onSeekToBar?: (timeSec: number) => void;
}

export const LiterarySpectrogram: React.FC<LiterarySpectrogramProps> = ({
  quantification,
  currentPositionMs = 0,
  durationMs,
  selectedVowel = null,
  onSelectVowel,
  onSeekToBar,
}) => {
  const { barMetrics, totalBars, complexityScore, rhymeDensity } = quantification;

  // Calculate current active bar index based on current playback time in ms
  const activeBarIndex = useMemo(() => {
    const currentSec = currentPositionMs / 1000;
    for (let i = 0; i < barMetrics.length; i++) {
      const bar = barMetrics[i];
      const nextBar = barMetrics[i + 1];
      if (bar.timeSec !== undefined) {
        const barStart = bar.timeSec;
        const barEnd = nextBar?.timeSec !== undefined ? nextBar.timeSec : barStart + 3.0;
        if (currentSec >= barStart && currentSec < barEnd) {
          return i;
        }
      }
    }
    return -1;
  }, [barMetrics, currentPositionMs]);

  // Overall progress percentage for playhead sweep
  const progressPercent = useMemo(() => {
    if (durationMs && durationMs > 0) {
      return Math.min(100, Math.max(0, (currentPositionMs / durationMs) * 100));
    }
    if (totalBars > 0 && activeBarIndex >= 0) {
      return ((activeBarIndex + 0.5) / totalBars) * 100;
    }
    return 0;
  }, [currentPositionMs, durationMs, totalBars, activeBarIndex]);

  return (
    <div className="w-full bg-black/80 backdrop-blur-md rounded-xl p-4 border border-white/10 text-white shadow-2xl flex flex-col gap-4">
      {/* Header with high level stats */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 animate-pulse" />
          <h3 className="font-bold text-sm tracking-wide text-gray-200 uppercase">
            Literary Spectrogram & Waveform
          </h3>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
            <span className="text-gray-400">Score:</span>
            <span className="text-yellow-400 font-bold">{complexityScore}/100</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
            <span className="text-gray-400">Density:</span>
            <span className="text-green-400 font-bold">{rhymeDensity}%</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
            <span className="text-gray-400">Bars:</span>
            <span className="text-purple-300 font-bold">{totalBars}</span>
          </div>
        </div>
      </div>

      {/* Interactive Spectrogram Graph */}
      <div className="relative w-full h-36 bg-gray-950/90 rounded-lg p-2 border border-white/5 overflow-hidden select-none">
        {/* Playhead indicator bar */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none transition-all duration-150 ease-out shadow-[0_0_8px_#ff0000]"
          style={{ left: `${progressPercent}%` }}
        >
          <div className="w-2.5 h-2.5 -ml-[4px] -mt-1 bg-red-500 rounded-full shadow-md" />
        </div>

        {/* Bars Container */}
        <div className="w-full h-full flex items-end justify-between gap-[2px] px-1 relative z-10">
          {barMetrics.map((bar: BarMetric, idx: number) => {
            const isActive = idx === activeBarIndex;
            const hasSelectedVowel =
              !selectedVowel || bar.vowels.includes(selectedVowel);
            const heightPercent = Math.min(100, Math.max(18, (bar.syllableCount / 16) * 100));

            return (
              <div
                key={`bar-${bar.barIndex}-${idx}`}
                onClick={() => bar.timeSec !== undefined && onSeekToBar?.(bar.timeSec)}
                title={`Bar ${bar.barIndex}: ${bar.syllableCount} syllables (${Math.round(bar.rhymeDensity * 100)}% rhymed)\n${bar.text}`}
                className={`group relative flex-1 h-full flex flex-col justify-end cursor-pointer transition-all duration-200 ${
                  hasSelectedVowel ? 'opacity-100' : 'opacity-20 hover:opacity-50'
                }`}
              >
                {/* Visual Bar Column */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-200 overflow-hidden flex flex-col justify-end ${
                    isActive
                      ? 'ring-2 ring-white scale-y-105 z-10 shadow-[0_0_12px_rgba(255,255,255,0.8)]'
                      : 'hover:brightness-125'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                >
                  {/* Colored segments inside bar matching rhyme vowels */}
                  {bar.colors.length > 0 ? (
                    bar.colors.map((color, cIdx) => (
                      <div
                        key={`c-${cIdx}`}
                        className="w-full flex-1"
                        style={{ backgroundColor: color }}
                      />
                    ))
                  ) : (
                    <div className="w-full h-full bg-gray-700/60" />
                  )}
                </div>

                {/* Subtitle / Bar index tag */}
                {idx % 4 === 0 && (
                  <span className="absolute -bottom-1 left-0 text-[8px] font-mono text-gray-500 pointer-events-none">
                    {bar.barIndex}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Vowel Rhyme Isolator Filter Bar */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Rhyme Scheme Isolator (Click a vowel to highlight connected bars):</span>
          {selectedVowel && (
            <button
              onClick={() => onSelectVowel?.(null)}
              className="text-xs text-pink-400 hover:text-pink-300 underline cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(quantification.vowelDistribution).map(([symbol, stat]) => {
            const isSelected = selectedVowel === symbol;
            return (
              <button
                key={symbol}
                onClick={() => onSelectVowel?.(isSelected ? null : symbol)}
                className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-white scale-105 shadow-md'
                    : 'opacity-70 hover:opacity-100 hover:scale-105'
                }`}
                style={{
                  backgroundColor: stat.color,
                  color: ['#f1f1f1', '#ffe400', '#abf200', '#ffa7a7', '#00d8ff', '#e8d9ff'].includes(
                    stat.color.toLowerCase()
                  )
                    ? '#000'
                    : '#fff',
                }}
              >
                <span>/{symbol}/</span>
                <span className="text-[10px] opacity-80">{stat.percentage}%</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default LiterarySpectrogram;
