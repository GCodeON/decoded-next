export const WORD_STYLE = {
  padding: '0.05em 0.15em',
  borderRadius: '6px',
  margin: '0 0.05em',
  display: 'inline-block' as const,
};

export const CURSOR_STYLE = {
  width: '4px',
  top: '4px',
  transition: 'all 0.05s linear',
  opacity: 0,
};

export const SEGMENT_STYLE = {
  transition: 'background-color 0.35s ease',
};

export const DEFAULT_WORD_DURATION = {
  MIN: 0.4,
  MAX: 1.5,
  FALLBACK: 0.6,
} as const;

export const SCROLL_OPTIONS = {
  behavior: 'smooth' as const,
  block: 'center' as const,
};
