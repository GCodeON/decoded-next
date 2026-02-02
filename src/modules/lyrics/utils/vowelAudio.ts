/**
 * Utility for playing vowel sounds
 * This module tries to load audio files first, then falls back to synthesis
 */

import { playSynthesizedVowel, isSynthesisSupported } from './vowelSynthesizer';

// Map IPA symbols to audio file names
export const vowelAudioMap: Record<string, string> = {
  // Monophthongs
  'i': 'fleece.mp3',
  'ɪ': 'kit.mp3',
  'ɛ': 'dress.mp3',
  'æ': 'trap.mp3',
  'ʌ': 'strut.mp3',
  'ɑ': 'lot.mp3',
  'ʊ': 'foot.mp3',
  'u': 'goose.mp3',
  'ɔ': 'thought.mp3',
  // Diphthongs
  'aɪ': 'price.mp3',
  'aʊ': 'mouth.mp3',
  'ɔɪ': 'choice.mp3',
  'eɪ': 'face.mp3',
  'oʊ': 'goat.mp3',
  // R-colored
  'ɝ': 'nurse.mp3',
  'ɑr': 'start.mp3',
  'ɔr': 'force.mp3',
  'ɪr': 'near.mp3',
  'ɛr': 'square.mp3',
  'ʊr': 'cure.mp3',
  // Reduced
  'ə': 'schwa.mp3',
  'ɨ': 'happy.mp3',
};

// Cache audio elements to avoid recreating them
const audioCache = new Map<string, HTMLAudioElement>();
const audioLoadAttempted = new Map<string, boolean>();

/**
 * Play a vowel sound by IPA symbol
 * Tries to load audio file first, falls back to synthesis if not available
 * @param ipaSymbol - The IPA symbol for the vowel (e.g., 'i', 'ɪ', 'aɪ')
 * @param preferSynthesis - If true, skip audio files and use synthesis directly
 */
export async function playVowelSound(ipaSymbol: string, preferSynthesis: boolean = false): Promise<void> {
  console.log(`Playing vowel: ${ipaSymbol}, preferSynthesis: ${preferSynthesis}`);
  
  // If synthesis is preferred or audio isn't mapped, use synthesis
  if (preferSynthesis || !vowelAudioMap[ipaSymbol]) {
    if (isSynthesisSupported()) {
      try {
        await playSynthesizedVowel(ipaSymbol);
        console.log(`✓ Played synthesized vowel: ${ipaSymbol}`);
      } catch (error) {
        console.error(`Error playing synthesized vowel ${ipaSymbol}:`, error);
      }
    } else {
      console.warn(`No audio support for IPA symbol: ${ipaSymbol}`);
    }
    return;
  }

  const fileName = vowelAudioMap[ipaSymbol];
  const audioPath = `/sounds/vowels/${fileName}`;
  
  // Get from cache or create new audio element
  let audio = audioCache.get(ipaSymbol);
  
  if (!audio && !audioLoadAttempted.get(ipaSymbol)) {
    audio = new Audio(audioPath);
    audioCache.set(ipaSymbol, audio);
    audioLoadAttempted.set(ipaSymbol, true);
    
    // Handle errors - fall back to synthesis
    audio.addEventListener('error', async (e) => {
      console.log(`Audio file not found for ${ipaSymbol}, using synthesis`);
      audioCache.delete(ipaSymbol); // Remove failed audio from cache
      
      // Play with synthesis instead
      if (isSynthesisSupported()) {
        await playSynthesizedVowel(ipaSymbol);
      }
    });
  }
  
  if (audio) {
    // Reset to beginning and play
    audio.currentTime = 0;
    audio.play().catch(async (error) => {
      console.log(`Error playing audio for ${ipaSymbol}, using synthesis:`, error);
      // Fall back to synthesis on playback error
      if (isSynthesisSupported()) {
        await playSynthesizedVowel(ipaSymbol);
      }
    });
  } else {
    // Use synthesis if audio failed to load previously
    if (isSynthesisSupported()) {
      await playSynthesizedVowel(ipaSymbol);
    }
  }
}

/**
 * Preload all vowel sounds for better performance
 */
export function preloadVowelSounds(): void {
  Object.entries(vowelAudioMap).forEach(([symbol, fileName]) => {
    const audio = new Audio(`/sounds/vowels/${fileName}`);
    audio.preload = 'auto';
    audioCache.set(symbol, audio);
  });
}
