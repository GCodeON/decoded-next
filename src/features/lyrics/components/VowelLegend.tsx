'use client';
import { vowels } from "@/features/lyrics/config/rhyme-colors";

export default function Legend() {
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
                  className={`w-10 h-10 2xl:w-14 2xl:h-14 rounded-lg shadow flex items-center justify-center font-bold ${sym === 'ə' || sym === 'ɨ' ? 'text-black' : 'text-white'} ${sym.length > 1 ? 'text-md' : 'text-lg'}`}
                  style={{backgroundColor: color}}
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
                    className={`w-10 h-10 2xl:w-14 2xl:h-14 rounded-lg shadow flex items-center justify-center font-bold ${sym === 'ə' || sym === 'ɨ' ? 'text-black' : 'text-white'} ${sym.length > 1 ? 'text-md' : 'text-lg'}`}
                    style={{backgroundColor: color}}
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
                  className={`w-10 h-10 2xl:w-14 2xl:h-14 rounded-lg shadow flex items-center justify-center font-bold ${sym === 'ə' || sym === 'ɨ' ? 'text-black' : 'text-white'} ${sym.length > 1 ? 'text-md' : 'text-lg'}`}
                  style={{backgroundColor: color}}
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
                    className={`w-10 h-10 2xl:w-14 2xl:h-14 rounded-lg shadow flex items-center justify-center font-bold ${sym === 'ə' || sym === 'ɨ' ? 'text-black' : 'text-white'} ${sym.length > 1 ? 'text-md' : 'text-lg'}`}
                    style={{backgroundColor: color}}
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
                  className={`w-10 h-10 2xl:w-14 2xl:h-14 rounded-lg shadow flex items-center justify-center font-bold ${sym === 'ə' || sym === 'ɨ' ? 'text-black' : 'text-white'} ${sym.length > 1 ? 'text-md' : 'text-lg'}`}
                  style={{backgroundColor: color}}
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
                  className={`w-10 h-10 2xl:w-14 2xl:h-14 rounded-lg shadow flex items-center justify-center font-bold ${sym === 'ə' || sym === 'ɨ' ? 'text-black' : 'text-white'} ${sym.length > 1 ? 'text-md' : 'text-lg'}`}
                  style={{backgroundColor: color}}
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