import { memo } from 'react';

interface PlainWordHighlightProps {
  lineText: string;
  isActive: boolean;
  filledWords: number;
}

const GRADIENT_STYLE = {
  background: 'linear-gradient(90deg, #29e2f6, #60e8ff)',
  backgroundClip: 'text',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
  transition: 'all 0.25s ease',
};

export const PlainWordHighlight = memo(function PlainWordHighlight({
  lineText,
  isActive,
  filledWords,
}: PlainWordHighlightProps) {
  return (
    <div className={isActive ? 'font-bold' : 'opacity-70'}>
      {lineText.split(/(\s+)/).map((part, i) => {
        if (/\s/.test(part)) return part;
        const wordIdx = Math.floor(i / 2);
        const isFilled = isActive && wordIdx < filledWords;
        return (
          <span key={i} style={isFilled ? GRADIENT_STYLE : undefined}>
            {part}
          </span>
        );
      })}
    </div>
  );
});
