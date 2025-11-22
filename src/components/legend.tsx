'use client';
import { vowels } from "@/utils/legend";

export default function Legend({toggle}:{toggle:boolean}){
  if(!toggle) return null;

  return (
    <div className="hidden md:block lg:col-span-3 xl:col-span-4 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-md 2xl:text-xl font-bold text-center mb-3 text-gray-800">
        General American Vowel Color Legend
      </h2>
      <div className="grid grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-1 xl-gap-3 mb-3">
        {Object.entries(vowels).map(([title, items]) => (
          <div key={title}>
            <h3 className={`font-bold text-xs mb-3 text-gray-600`}>{title}</h3>
            <div className="space-y-3">
              {Object.entries(items).map(([sym, {color, label}]) => {
                const reduced = sym === 'ə' || sym === 'ɨ';
                return (
                  <div key={sym} className="flex items-center gap-2">
                    <span
                      className={`w-10 h-10 2xl:w-14 2xl:h-14 rounded-lg shadow flex items-center justify-center font-bold ${reduced?'text-black':'text-white'} ${sym.length>1?'text-md':'text-lg'}`}
                      style={{backgroundColor: color}}
                    >{sym}</span>
                    <div>
                      <div className="text-gray-600 font-bold" style={{fontSize: '10px'}}>{label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}