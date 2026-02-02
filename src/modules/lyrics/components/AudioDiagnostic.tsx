'use client';

import { useState, useEffect } from 'react';
import { playVowelSound } from '@/modules/lyrics/utils/vowelAudio';
import { isSynthesisSupported, playTestBeep } from '@/modules/lyrics/utils/vowelSynthesizer';

/**
 * Quick diagnostic component to test vowel audio
 * Add this temporarily to any page to test audio functionality
 */
export default function AudioDiagnostic() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [supported, setSupported] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to avoid hydration errors
  if (!mounted) {
    return null;
  }

  const testBeep = async () => {
    setStatus('Testing simple beep...');
    
    try {
      await playTestBeep();
      setStatus('✓ Beep played! If you heard it, audio works. If not, check volume/speakers.');
    } catch (error) {
      setStatus(`❌ Beep error: ${error}`);
      console.error('Beep test error:', error);
    }
  };

  const testAudio = async () => {
    setStatus('Testing...');
    
    // Check support
    const isSupported = isSynthesisSupported();
    setSupported(isSupported);
    
    if (!isSupported) {
      setStatus('❌ Web Audio API not supported in this browser');
      return;
    }
    
    setStatus('✓ Web Audio API supported. Playing test vowel /i/...');
    
    try {
      await playVowelSound('i', true);
      setStatus('✓ Success! Sound should have played. Check your volume.');
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
      console.error('Audio test error:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <h3 className="font-bold mb-2">🔊 Audio Diagnostic</h3>
      <p className="text-sm text-gray-600 mb-3">{status}</p>
      
      <div className="space-y-2">
        <button
          onClick={testBeep}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
        >
          Test Simple Beep (440Hz)
        </button>
        
        <button
          onClick={testAudio}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
        >
          Test Vowel Synthesis
        </button>
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        <p>• Check your volume is up</p>
        <p>• Check browser console for logs</p>
        <p>• Web Audio: {supported ? '✓' : '?'}</p>
      </div>
    </div>
  );
}
