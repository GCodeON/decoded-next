/**
 * Vowel synthesizer using Web Audio API
 * Generates vowel sounds based on formant frequencies
 */

interface FormantData {
  f1: number; // First formant frequency (Hz)
  f2: number; // Second formant frequency (Hz)
  f3: number; // Third formant frequency (Hz)
}

// Formant frequencies for General American vowels (in Hz)
// Based on research from Peterson & Barney (1952) and Hillenbrand et al. (1995)
const vowelFormants: Record<string, FormantData> = {
  // Monophthongs
  'i': { f1: 280, f2: 2250, f3: 2890 },  // FLEECE
  'ɪ': { f1: 400, f2: 1920, f3: 2560 },  // KIT
  'ɛ': { f1: 550, f2: 1770, f3: 2490 },  // DRESS
  'æ': { f1: 690, f2: 1660, f3: 2490 },  // TRAP
  'ʌ': { f1: 670, f2: 1190, f3: 2390 },  // STRUT
  'ɑ': { f1: 710, f2: 1100, f3: 2540 },  // LOT
  'ʊ': { f1: 450, f2: 1030, f3: 2380 },  // FOOT
  'u': { f1: 310, f2: 870, f3: 2250 },   // GOOSE
  'ɔ': { f1: 590, f2: 880, f3: 2540 },   // THOUGHT
  
  // Diphthongs (use starting formants)
  'aɪ': { f1: 710, f2: 1100, f3: 2540 }, // PRICE (ɑ→ɪ)
  'aʊ': { f1: 710, f2: 1100, f3: 2540 }, // MOUTH (ɑ→ʊ)
  'ɔɪ': { f1: 590, f2: 880, f3: 2540 },  // CHOICE (ɔ→ɪ)
  'eɪ': { f1: 550, f2: 1770, f3: 2490 }, // FACE (ɛ→ɪ)
  'oʊ': { f1: 590, f2: 880, f3: 2540 },  // GOAT (ɔ→ʊ)
  
  // R-colored (approximations with lowered F3)
  'ɝ': { f1: 490, f2: 1350, f3: 1690 },  // NURSE
  'ɑr': { f1: 710, f2: 1100, f3: 1680 }, // START
  'ɔr': { f1: 590, f2: 880, f3: 1680 },  // FORCE
  'ɪr': { f1: 400, f2: 1920, f3: 1680 }, // NEAR
  'ɛr': { f1: 550, f2: 1770, f3: 1680 }, // SQUARE
  'ʊr': { f1: 450, f2: 1030, f3: 1680 }, // CURE
  
  // Reduced
  'ə': { f1: 500, f2: 1500, f3: 2500 },  // SCHWA
  'ɨ': { f1: 350, f2: 1900, f3: 2550 },  // HAPPY
};

// Diphthong targets for gliding vowels
const diphthongTargets: Record<string, FormantData> = {
  'aɪ': { f1: 400, f2: 1920, f3: 2560 },  // →ɪ
  'aʊ': { f1: 450, f2: 1030, f3: 2380 },  // →ʊ
  'ɔɪ': { f1: 400, f2: 1920, f3: 2560 },  // →ɪ
  'eɪ': { f1: 400, f2: 1920, f3: 2560 },  // →ɪ
  'oʊ': { f1: 450, f2: 1030, f3: 2380 },  // →ʊ
};

class VowelSynthesizer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private async getAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      console.log('🎹 Initializing AudioContext...');
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.8; // Increased master volume from 0.3 to 0.8
      console.log('✓ AudioContext initialized, state:', this.audioContext.state);
      console.log('🔊 Master volume set to:', this.masterGain.gain.value);
      console.log('🔊 Destination:', this.audioContext.destination);
    }
    
    // Resume context if suspended (required by browser autoplay policies)
    if (this.audioContext.state === 'suspended') {
      console.log('⏸️  AudioContext suspended, resuming...');
      await this.audioContext.resume();
      console.log('▶️  AudioContext resumed, state:', this.audioContext.state);
    }
    
    return this.audioContext;
  }

  /**
   * Test function - play a simple beep to verify audio works
   */
  public async playTestBeep(): Promise<void> {
    console.log('🔔 Playing test beep...');
    const context = await this.getAudioContext();
    const now = context.currentTime;
    
    const oscillator = context.createOscillator();
    oscillator.frequency.value = 440; // A4 note
    
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    oscillator.connect(gain);
    gain.connect(context.destination);
    
    oscillator.start(now);
    oscillator.stop(now + 0.5);
    
    console.log('✓ Test beep should play now!');
  }

  /**
   * Create a formant filter (peaking filter instead of bandpass)
   */
  private createFormant(
    context: AudioContext,
    frequency: number,
    q: number = 5
  ): BiquadFilterNode {
    const filter = context.createBiquadFilter();
    filter.type = 'peaking'; // Changed from bandpass to peaking
    filter.frequency.value = frequency;
    filter.Q.value = q;
    filter.gain.value = 20; // Boost the formant frequency
    console.log(`🎛️  Created formant filter: ${frequency}Hz, Q=${q}, gain=20dB`);
    return filter;
  }

  /**
   * Play a monophthong (single steady vowel)
    */
  private async playMonophthong(
    formants: FormantData,
    duration: number = 0.35
  ): Promise<void> {
    const context = await this.getAudioContext();
    const now = context.currentTime;

    // Create source (sawtooth for rich harmonics)
    const oscillator = context.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 120; // Fundamental frequency (average male voice)

    // Create a low-pass filter to smooth the sound
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 4000; // Cut off high frequencies
    lowpass.Q.value = 1;

    // Create formant filters with moderate Q values
    const formant1 = this.createFormant(context, formants.f1, 10);
    const formant2 = this.createFormant(context, formants.f2, 10);
    const formant3 = this.createFormant(context, formants.f3, 10);

    // Create envelope
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02); // Reduced from 0.5 since we're boosting formants
    gain.gain.setValueAtTime(0.2, now + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, now + duration); // Release

    console.log('🔗 Connecting audio nodes...');
    // Connect the chain: oscillator -> lowpass -> formants -> gain -> output
    oscillator.connect(lowpass);
    lowpass.connect(formant1);
    formant1.connect(formant2);
    formant2.connect(formant3);
    formant3.connect(gain);
    gain.connect(this.masterGain!);

    console.log(`▶️  Starting oscillator at ${now.toFixed(3)}s for ${duration}s`);
    // Play
    oscillator.start(now);
    oscillator.stop(now + duration);
    console.log('✓ Oscillator started and scheduled to stop');
  }

  /**
   * Play a diphthong (gliding vowel)
   */
  private async playDiphthong(
    startFormants: FormantData,
    endFormants: FormantData,
    duration: number = 0.45
  ): Promise<void> {
    const context = await this.getAudioContext();
    const now = context.currentTime;
    const glideTime = duration * 0.6; // Start gliding at 60% through

    // Create source
    const oscillator = context.createOscillator();
    oscillator.type = 'sawtooth';
    oscillator.frequency.value = 120;

    // Create a low-pass filter
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 4000;
    lowpass.Q.value = 1;

    // Create formant filters with moderate Q values
    const formant1 = this.createFormant(context, startFormants.f1, 10);
    const formant2 = this.createFormant(context, startFormants.f2, 10);
    const formant3 = this.createFormant(context, startFormants.f3, 10);

    // Animate formants for diphthong glide
    formant1.frequency.setValueAtTime(startFormants.f1, now);
    formant1.frequency.linearRampToValueAtTime(endFormants.f1, now + glideTime);

    formant2.frequency.setValueAtTime(startFormants.f2, now);
    formant2.frequency.linearRampToValueAtTime(endFormants.f2, now + glideTime);

    formant3.frequency.setValueAtTime(startFormants.f3, now);
    formant3.frequency.linearRampToValueAtTime(endFormants.f3, now + glideTime);

    // Create envelope
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02); // Reduced volume
    gain.gain.setValueAtTime(0.2, now + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    console.log('🔗 Connecting diphthong audio nodes...');
    // Connect the chain
    oscillator.connect(lowpass);
    lowpass.connect(formant1);
    formant1.connect(formant2);
    formant2.connect(formant3);
    formant3.connect(gain);
    gain.connect(this.masterGain!);

    console.log(`▶️  Starting diphthong oscillator at ${now.toFixed(3)}s for ${duration}s`);
    // Play
    oscillator.start(now);
    oscillator.stop(now + duration);
    console.log('✓ Diphthong oscillator started and scheduled to stop');
  }

  /**
   * Play a vowel sound by IPA symbol
   */
  public async playVowel(ipaSymbol: string): Promise<void> {
    console.log(`🎤 Synthesizer.playVowel called for: ${ipaSymbol}`);
    
    try {
      const formants = vowelFormants[ipaSymbol];
      
      if (!formants) {
        console.warn(`No formant data for IPA symbol: ${ipaSymbol}`);
        return;
      }

      console.log(`📊 Formants for ${ipaSymbol}:`, formants);

      // Check if it's a diphthong
      const target = diphthongTargets[ipaSymbol];
      
      if (target) {
        console.log(`🎵 Playing diphthong: ${ipaSymbol}`);
        await this.playDiphthong(formants, target, 0.45);
      } else {
        console.log(`🎵 Playing monophthong: ${ipaSymbol}`);
        await this.playMonophthong(formants, 0.35);
      }
      
      console.log(`✓ Synthesizer.playVowel completed for: ${ipaSymbol}`);
    } catch (error) {
      console.error(`Error playing vowel ${ipaSymbol}:`, error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.masterGain = null;
    }
  }
}

// Create singleton instance
const synthesizer = new VowelSynthesizer();

/**
 * Play a synthesized vowel sound by IPA symbol
 * @param ipaSymbol - The IPA symbol for the vowel (e.g., 'i', 'ɪ', 'aɪ')
 */
export async function playSynthesizedVowel(ipaSymbol: string): Promise<void> {
  await synthesizer.playVowel(ipaSymbol);
}

/**
 * Play a test beep to verify audio is working
 */
export async function playTestBeep(): Promise<void> {
  await synthesizer.playTestBeep();
}

/**
 * Check if synthesized audio is supported
 */
export function isSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false; // Fix SSR issue
  return !!(window.AudioContext || (window as any).webkitAudioContext);
}

export default synthesizer;
