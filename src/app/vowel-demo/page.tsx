'use client';

import VowelAudioTest from '@/modules/lyrics/components/VowelAudioTest';
import Legend from '@/modules/lyrics/components/VowelLegend';
import AudioDiagnostic from '@/modules/lyrics/components/AudioDiagnostic';

export default function VowelSoundsDemo() {
  return (
    <div className="min-h-screen  from-blue-50 to-purple-50 p-8 bg-black">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Vowel Sounds Demo</h1>
          <p className="text-gray-600">
            Interactive demonstration of synthesized vowel sounds using Web Audio API
          </p>
        </div>

        <div className=" rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">How It Works</h2>
          <div className="prose prose-sm">
            <p>
              This demo uses <strong>formant synthesis</strong> to generate vowel sounds programmatically. 
              Each vowel is defined by three formant frequencies (F1, F2, F3) that create its unique sound quality.
            </p>
            <ul>
              <li><strong>Monophthongs</strong> - Single steady vowel sounds (e.g., /i/, /ɑ/)</li>
              <li><strong>Diphthongs</strong> - Gliding vowels that transition (e.g., /aɪ/, /aʊ/)</li>
              <li><strong>R-colored</strong> - Vowels with rhotic quality (lowered F3)</li>
            </ul>
            <p className="text-sm text-gray-600 mt-4">
              Based on acoustic research: Peterson & Barney (1952), Hillenbrand et al. (1995)
            </p>
          </div>
        </div>

        <VowelAudioTest />

        <div>
          <h2 className="text-2xl font-bold mb-4">Vowel Legend (Interactive)</h2>
          <p className="text-gray-600 mb-4">
            This is the same component used in your app. Click any vowel to hear its sound!
          </p>
          <Legend />
        </div>

        <div className=" rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Technical Details</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-bold mb-2">Formant Synthesis</h3>
              <p className="text-gray-700">
                Uses Web Audio API to create a sawtooth wave (rich in harmonics) and passes it 
                through three bandpass filters tuned to the vowel's formant frequencies. This 
                mimics how the human vocal tract resonates to produce different vowel sounds.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Diphthong Animation</h3>
              <p className="text-gray-700">
                Diphthongs smoothly transition formant frequencies from the starting vowel to 
                the target vowel, creating a natural gliding effect.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Benefits</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>No external audio files needed</li>
                <li>Consistent pronunciation across all vowels</li>
                <li>Small bundle size (pure JavaScript)</li>
                <li>Works offline immediately</li>
                <li>Fallback mechanism if audio files unavailable</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <AudioDiagnostic />
    </div>
  );
}
