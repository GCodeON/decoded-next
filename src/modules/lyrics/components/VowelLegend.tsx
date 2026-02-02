'use client';
import { useState } from 'react';
import { vowels } from "@/modules/lyrics/";
import { playVowelSound } from "@/modules/lyrics/utils/vowelAudio";

// Helper to determine if text should be black or white based on background color
function getTextColor(bgColor: string): string {
  // Convert hex to RGB
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate perceived brightness (YIQ formula)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return black for bright colors, white for dark colors
  return brightness > 155 ? 'text-black' : 'text-white';
}

export default function Legend() {
  const [playing, setPlaying] = useState<string | null>(null);

  // Use real audio files (falls back to synthesis if not available)
  const handleVowelClick = async (symbol: string) => {
    console.log('🎵 Vowel clicked:', symbol);
    setPlaying(symbol);
    
    try {
      await playVowelSound(symbol, false); // false = try audio files first, fallback to synthesis
      console.log('✓ Vowel played successfully:', symbol);
    } catch (error) {
      console.error('❌ Error playing vowel:', symbol, error);
    }
    
    setTimeout(() => setPlaying(null), 450); // Clear after sound duration
  };
  
  // Responsive grouping
  const mono = vowels['Monophthongs'] || {};
  const diph = vowels['Diphthongs'] || {};
  const rcol = vowels['R-colored'] || {};
  const reduced = vowels['Reduced'] || {};

  return (
    <div className="hidden md:block bg-white rounded-xl shadow-lg p-3 border border-gray-200">
      <h2 className="text-xs 2xl:text-xl font-bold text-center mb-2 text-gray-800">
        General American Vowel Color Legend
      </h2>
      <hr className="mb-3"></hr>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-3">
        {/* Column 1: Monophthongs + Reduced (lg), Monophthongs (xl) */}
        <div>
          <h3 className="font-bold text-xs mb-3 text-gray-600">Monophthongs</h3>
          <div className="space-y-3">
            {Object.entries(mono).map(([sym, {color, label}]) => (
              <div key={sym} className="flex items-center gap-2">
                <span
                  className={`w-10 h-10 2xl:w-14 2xl:h-14 rounded-lg shadow flex items-center justify-center font-bold cursor-pointer transition-all ${playing === sym ? 'scale-105 ring-2 ring-blue-400' : 'hover:opacity-80'} ${getTextColor(color)} ${sym.length > 1 ? 'text-md' : 'text-lg'}`}
                  style={{backgroundColor: color}}
                  onClick={() => handleVowelClick(sym)}
                  title={`Play ${label} sound`}
                >{sym}</span>
                <div>
                  <div className="text-gray-600 font-bold" style={{fontSize: '10px'}}>{label}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Reduced only visible in lg, hidden in xl */}
          <div className="mt-6 xl:hidden">
            <h3 className="font-bold text-xs mb-3 text-gray-600">Reduced</h3>
            <div className="space-y-3">
              {Object.entries(reduced).map(([sym, {color, label}]) => (
                <div key={sym} className="flex items-center gap-2">
                  <span
                    className={`w-10 h-10 2xl:w-14 2xl:h-14 rounded-lg shadow flex items-center justify-center font-bold cursor-pointer transition-all ${playing === sym ? 'scale-105 ring-2 ring-blue-400' : 'hover:opacity-80'} ${getTextColor(color)} ${sym.length > 1 ? 'text-md' : 'text-lg'}`}
                    style={{backgroundColor: color}}
                    onClick={() => handleVowelClick(sym)}
                    title={`Play ${label} sound`}
                  >{sym}</span>
                  <div>
                    <div className="text-gray-600 font-bold" style={{fontSize: '10px'}}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Column 2: Diphthongs + R-colored (lg), Diphthongs (xl) */}
        <div>
          <h3 className="font-bold text-xs mb-3 text-gray-600">Diphthongs</h3>
          <div className="space-y-3">
            {Object.entries(diph).map(([sym, {color, label}]) => (
              <div key={sym} className="flex items-center gap-2">
                <span
                  className={`w-10 h-10 2xl:w-14 2xl:h-14 rounded-lg shadow flex items-center justify-center font-bold cursor-pointer transition-all ${playing === sym ? 'scale-105 ring-2 ring-blue-400' : 'hover:opacity-80'} ${getTextColor(color)} ${sym.length > 1 ? 'text-md' : 'text-lg'}`}
                  style={{backgroundColor: color}}
                  onClick={() => handleVowelClick(sym)}
                  title={`Play ${label} sound`}
                >{sym}</span>
                <div>
                  <div className="text-gray-600 font-bold" style={{fontSize: '10px'}}>{label}</div>
                </div>
              </div>
            ))}
          </div>
          {/* R-colored only visible in lg, hidden in xl */}
          <div className="mt-6 xl:hidden">
            <h3 className="font-bold text-xs mb-3 text-gray-600">R-colored</h3>
            <div className="space-y-3">
              {Object.entries(rcol).map(([sym, {color, label}]) => (
                <div key={sym} className="flex items-center gap-2">
                  <span
                    className={`w-10 h-10 2xl:w-14 2xl:h-14 rounded-lg shadow flex items-center justify-center font-bold cursor-pointer transition-all ${playing === sym ? 'scale-105 ring-2 ring-blue-400' : 'hover:opacity-80'} ${getTextColor(color)} ${sym.length > 1 ? 'text-md' : 'text-lg'}`}
                    style={{backgroundColor: color}}
                    onClick={() => handleVowelClick(sym)}
                    title={`Play ${label} sound`}
                  >{sym}</span>
                  <div>
                    <div className="text-gray-600 font-bold" style={{fontSize: '10px'}}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* xl and up: Reduced in col 3, R-colored in col 4 */}
        <div className="hidden xl:block">
          <h3 className="font-bold text-xs mb-3 text-gray-600">R-colored</h3>
          <div className="space-y-3">
            {Object.entries(rcol).map(([sym, {color, label}]) => (
              <div key={sym} className="flex items-center gap-2">
                <span
                  className={`w-10 h-10 2xl:w-14 2xl:h-14 rounded-lg shadow flex items-center justify-center font-bold cursor-pointer transition-all ${playing === sym ? 'scale-105 ring-2 ring-blue-400' : 'hover:opacity-80'} ${getTextColor(color)} ${sym.length > 1 ? 'text-md' : 'text-lg'}`}
                  style={{backgroundColor: color}}
                  onClick={() => handleVowelClick(sym)}
                  title={`Play ${label} sound`}
                >{sym}</span>
                <div>
                  <div className="text-gray-600 font-bold" style={{fontSize: '10px'}}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden xl:block">
          <h3 className="font-bold text-xs mb-3 text-gray-600">Reduced</h3>
          <div className="space-y-3">
            {Object.entries(reduced).map(([sym, {color, label}]) => (
              <div key={sym} className="flex items-center gap-2">
                <span
                  className={`w-10 h-10 2xl:w-14 2xl:h-14 rounded-lg shadow flex items-center justify-center font-bold cursor-pointer transition-all ${playing === sym ? 'scale-105 ring-2 ring-blue-400' : 'hover:opacity-80'} ${getTextColor(color)} ${sym.length > 1 ? 'text-md' : 'text-lg'}`}
                  style={{backgroundColor: color}}
                  onClick={() => handleVowelClick(sym)}
                  title={`Play ${label} sound`}
                >{sym}</span>
                <div>
                  <div className="text-gray-600 font-bold" style={{fontSize: '10px'}}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}