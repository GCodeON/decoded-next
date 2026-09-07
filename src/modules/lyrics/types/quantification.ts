export interface VowelStat {
  count: number;
  percentage: number;
  label: string;
  color: string;
  category: 'Monophthongs' | 'Diphthongs' | 'R-colored' | 'Reduced' | 'Custom';
}

export interface BarMetric {
  barIndex: number;
  lineIndex: number;
  text: string;
  timeSec?: number;
  syllableCount: number;
  rhymedSyllableCount: number;
  rhymeDensity: number; // 0 to 1
  vowels: string[];
  colors: string[];
}

export interface LiteraryDeviceStats {
  assonanceCount: number;
  alliterationCount: number;
  slantRhymeCount: number;
  multiSyllableChainsCount: number;
  internalRhymeDensity: number; // 0 to 100
  endRhymeDensity: number; // 0 to 100
}

export interface LyricalQuantification {
  trackId?: string;
  artist?: string;
  title?: string;
  computedAt: string;
  
  // High level scores
  complexityScore: number; // 0 to 100
  rhymeDensity: number; // 0 to 100 (percentage of rhyming content)
  avgSyllablesPerBar: number;
  uniqueRhymeCount: number;
  
  // Aggregate counts
  totalBars: number;
  totalWords: number;
  totalSyllables: number;
  totalRhymedWords: number;
  
  // Distributions
  vowelDistribution: Record<string, VowelStat>;
  vowelCategoryDistribution: {
    Monophthongs: { count: number; percentage: number };
    Diphthongs: { count: number; percentage: number };
    'R-colored': { count: number; percentage: number };
    Reduced: { count: number; percentage: number };
  };
  
  // Literary Breakdown
  literaryDevices: LiteraryDeviceStats;
  
  // Timeline bar-by-bar spectrogram data
  barMetrics: BarMetric[];
}
