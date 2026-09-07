'use client';

import React, { useState } from 'react';
import { FaTimes, FaBrain, FaChartPie, FaWaveSquare, FaMagic, FaFire, FaLayerGroup } from 'react-icons/fa';
import type { LyricalQuantification } from '../types/quantification';
import LiterarySpectrogram from './LiterarySpectrogram';

interface LyricalQuantificationDashboardProps {
  quantification: LyricalQuantification;
  isOpen: boolean;
  onClose: () => void;
  currentPositionMs?: number;
  durationMs?: number;
  onSeekToBar?: (timeSec: number) => void;
}

export const LyricalQuantificationDashboard: React.FC<LyricalQuantificationDashboardProps> = ({
  quantification,
  isOpen,
  onClose,
  currentPositionMs = 0,
  durationMs,
  onSeekToBar,
}) => {
  const [selectedVowel, setSelectedVowel] = useState<string | null>(null);

  if (!isOpen) return null;

  const {
    artist,
    title,
    complexityScore,
    rhymeDensity,
    avgSyllablesPerBar,
    uniqueRhymeCount,
    totalBars,
    totalWords,
    totalSyllables,
    vowelCategoryDistribution,
    vowelDistribution,
    literaryDevices,
  } = quantification;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl text-white flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-xl shadow-lg">
              <FaBrain className="text-xl text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                Lyrical Quantification <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">RapGenius 2.0</span>
              </h2>
              <p className="text-xs text-gray-400">
                Literary Fingerprint & Rhyme Analysis for <span className="text-purple-300 font-semibold">{artist || 'Artist'}</span> — &quot;{title || 'Song'}&quot;
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <FaTimes />
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex flex-col gap-1">
            <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
              <FaFire className="text-orange-400" /> Complexity Score
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-yellow-400">{complexityScore}</span>
              <span className="text-xs text-gray-500">/ 100</span>
            </div>
            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-gradient-to-r from-yellow-500 to-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${complexityScore}%` }}
              />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex flex-col gap-1">
            <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
              <FaWaveSquare className="text-green-400" /> Rhyme Density
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-green-400">{rhymeDensity}%</span>
            </div>
            <span className="text-[10px] text-gray-400">Rhymed syllables ratio</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex flex-col gap-1">
            <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
              <FaMagic className="text-purple-400" /> Syllables / Bar
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-purple-400">{avgSyllablesPerBar}</span>
              <span className="text-xs text-gray-500">avg</span>
            </div>
            <span className="text-[10px] text-gray-400">{totalSyllables} syllables across {totalBars} bars</span>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex flex-col gap-1">
            <span className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
              <FaLayerGroup className="text-pink-400" /> Rhyme Breadth
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-pink-400">{uniqueRhymeCount}</span>
              <span className="text-xs text-gray-500">vowel keys</span>
            </div>
            <span className="text-[10px] text-gray-400">{totalWords} total words</span>
          </div>
        </div>

        {/* Literary Spectrogram & Waveform Section */}
        <LiterarySpectrogram
          quantification={quantification}
          currentPositionMs={currentPositionMs}
          durationMs={durationMs}
          selectedVowel={selectedVowel}
          onSelectVowel={setSelectedVowel}
          onSeekToBar={onSeekToBar}
        />

        {/* Detailed Breakdown: Literary Devices & Vowel DNA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Literary Devices Breakdown */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
            <h4 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <FaBrain className="text-purple-400" /> Literary Devices & Flow Patterns
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-950/60 p-2.5 rounded-lg border border-white/5">
                <span className="text-gray-400 block mb-1">Assonance & Vowel Bending</span>
                <span className="text-lg font-bold text-teal-300">{literaryDevices.assonanceCount}</span>
                <span className="text-[10px] text-gray-500 block">internal vowel harmonies</span>
              </div>

              <div className="bg-gray-950/60 p-2.5 rounded-lg border border-white/5">
                <span className="text-gray-400 block mb-1">Alliteration Occurrences</span>
                <span className="text-lg font-bold text-pink-300">{literaryDevices.alliterationCount}</span>
                <span className="text-[10px] text-gray-500 block">matching initial consonants</span>
              </div>

              <div className="bg-gray-950/60 p-2.5 rounded-lg border border-white/5">
                <span className="text-gray-400 block mb-1">Multi-Syllable Chains</span>
                <span className="text-lg font-bold text-yellow-300">{literaryDevices.multiSyllableChainsCount}</span>
                <span className="text-[10px] text-gray-500 block">compound rhyme links</span>
              </div>

              <div className="bg-gray-950/60 p-2.5 rounded-lg border border-white/5">
                <span className="text-gray-400 block mb-1">End Rhyme Match Rate</span>
                <span className="text-lg font-bold text-green-300">{literaryDevices.endRhymeDensity}%</span>
                <span className="text-[10px] text-gray-500 block">terminal line cohesion</span>
              </div>
            </div>
          </div>

          {/* Vowel Category Distribution (Literary DNA) */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
            <h4 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <FaChartPie className="text-pink-400" /> Vowel Category Distribution (Literary DNA)
            </h4>

            <div className="flex flex-col gap-2 text-xs">
              {Object.entries(vowelCategoryDistribution).map(([cat, info]) => (
                <div key={cat} className="flex flex-col gap-1">
                  <div className="flex justify-between text-gray-300">
                    <span className="font-mono">{cat}</span>
                    <span className="font-bold">{info.percentage}% ({info.count})</span>
                  </div>
                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        cat === 'Monophthongs'
                          ? 'bg-red-500'
                          : cat === 'Diphthongs'
                          ? 'bg-purple-500'
                          : cat === 'R-colored'
                          ? 'bg-indigo-500'
                          : 'bg-gray-400'
                      }`}
                      style={{ width: `${info.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LyricalQuantificationDashboard;
