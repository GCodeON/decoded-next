/**
 * Test component for vowel audio playback
 * Add this to any page to test the vowel sound system
 */
'use client';

import { playVowelSound, preloadVowelSounds, vowelAudioMap } from '@/modules/lyrics/utils/vowelAudio';
import { playSynthesizedVowel, isSynthesisSupported } from '@/modules/lyrics/utils/vowelSynthesizer';
import { useEffect, useState } from 'react';

export default function VowelAudioTest() {
  const [preloaded, setPreloaded] = useState(false);
  const [lastPlayed, setLastPlayed] = useState<string>('');
  const [useSynthesis, setUseSynthesis] = useState(true); // Default to synthesis
  const [synthesisSupported, setSynthesisSupported] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check synthesis support only on client side
    setMounted(true);
    setSynthesisSupported(isSynthesisSupported());
  }, []);

  const handlePlay = (symbol: string) => {
    if (useSynthesis) {
      playSynthesizedVowel(symbol);
    } else {
      playVowelSound(symbol, false);
    }
    setLastPlayed(symbol);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="p-4  rounded-lg">
        <h2 className="text-xl font-bold mb-4">Vowel Audio Test</h2>
        <div className="mb-4 p-3 bg-blue-100 rounded">
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Vowel Audio Test</h2>
      
      <div className="mb-4 p-3 bg-blue-100 rounded">
        <p className="text-sm text-black">
          <strong>Instructions:</strong> Click any IPA symbol below to play its vowel sound.
        </p>
        {lastPlayed && (
          <p className="text-sm mt-2 text-black">
            Last played: <strong>{lastPlayed}</strong>
          </p>
        )}
      </div>

      {synthesisSupported && (
        <div className="mb-4 flex gap-4 items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useSynthesis}
              onChange={(e) => setUseSynthesis(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">
              Use Synthesized Sounds (Web Audio API)
            </span>
          </label>
          <span className="text-xs text-gray-600">
            {useSynthesis ? '🎵 Using formant synthesis' : '🔊 Using audio files'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(vowelAudioMap).map(([symbol, filename]) => (
          <button
            key={symbol}
            onClick={() => handlePlay(symbol)}
            className="p-4  border-2 border-gray-300 rounded-lg hover:bg-blue-800 hover:border-blue-500 transition-all cursor-pointer"
          >
            <div className="text-2xl font-bold mb-1 text-white">{symbol}</div>
            <div className="text-xs text-gray-600">{filename}</div>
          </button>
        ))}
      </div>

      {!useSynthesis && (
        <div className="mt-4">
          <button
            onClick={() => {
              preloadVowelSounds();
              setPreloaded(true);
            }}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={preloaded}
          >
            {preloaded ? 'Audio Files Preloaded ✓' : 'Preload All Audio Files'}
          </button>
        </div>
      )}

      {useSynthesis && (
        <div className="mt-4 p-3 bg-green-100 rounded text-sm text-black">
          <strong>✓ Using Synthesized Sounds!</strong> No audio files needed. Vowel sounds are 
          generated using Web Audio API with formant synthesis based on acoustic phonetics research.
        </div>
      )}

      {!useSynthesis && (
        <div className="mt-4 p-3 bg-yellow-100 rounded text-sm text-black">
          <strong>Using Audio Files Mode:</strong> Make sure you have MP3 files in{' '}
          <code>/public/sounds/vowels/</code>. If files are missing, it will automatically 
          fall back to synthesis.
        </div>
      )}
    </div>
  );
}
