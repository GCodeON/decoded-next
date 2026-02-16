export const WORD_STYLE = {
  padding: '0.05em 0.15em',
  borderRadius: '6px',
  margin: '0 0.05em',
  display: 'inline-block' as const,
};

export const SEGMENT_STYLE = {};

export const DEFAULT_WORD_DURATION = {
  MIN: 0.4,
  MAX: 1.5,
  FALLBACK: 0.6,
} as const;

export const SEGMENT_ANIMATION = {
  STAGGER_DELAY: 0.15, // Time in seconds between each segment reveal (0.08s = 80ms)
  REVEAL_DURATION: 0.2, // Time for each segment to animate in (in seconds)
} as const;

export const SCROLL_OPTIONS = {
  behavior: 'smooth' as const,
  block: 'center' as const,
};
