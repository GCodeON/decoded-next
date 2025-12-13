/**
 * Utilities for replacing text in LRC formats while preserving timestamps
 * Supports both line-level [MM:SS.xx] and word-level <MM:SS.xx> timing tags
 */

/**
 * Result from text replacement operation
 */
export interface ReplaceResult {
  updated: string;
  replacedCount: number;
  caseMatches: Array<{ line: number; variant: string }>;
}

/**
 * Result from lyrics consistency validation
 */
export interface ConsistencyCheckResult {
  isConsistent: boolean;
  plainWordCount: number;
  syncedWordCount: number;
  mismatchedLines: number[];
  tolerance: number;
}

/**
 * Represents a word-level change between two text versions
 */
export interface TextChange {
  oldWord: string;
  newWord: string;
  lineNumber: number;
}

/**
 * Detects case variations of a word in text (exact word boundaries)
 * Examples: "intergrated" -> ["INTERGRATED", "Intergrated", "intergrated"]
 */
export function detectCaseVariants(text: string, searchText: string): Array<{ variant: string; count: number }> {
  const variants: Map<string, number> = new Map();
  
  // Create regex with word boundaries - exact match case-insensitive
  const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordBoundaryRegex = new RegExp(`\\b${escapedSearch}\\b`, 'gi');
  
  let match;
  while ((match = wordBoundaryRegex.exec(text)) !== null) {
    const found = text.slice(match.index, match.index + searchText.length);
    variants.set(found, (variants.get(found) || 0) + 1);
  }
  
  return Array.from(variants.entries())
    .map(([variant, count]) => ({ variant, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Applies case transformation from source to target word
 * Examples:
 *   applyCaseTransformation("intergrated", "integrated") -> "integrated"
 *   applyCaseTransformation("INTERGRATED", "integrated") -> "INTEGRATED"
 *   applyCaseTransformation("Intergrated", "integrated") -> "Integrated"
 */
export function applyCaseTransformation(sourceWord: string, targetWord: string): string {
  if (sourceWord.length === 0) return targetWord;
  
  // All uppercase
  if (sourceWord === sourceWord.toUpperCase() && sourceWord !== sourceWord.toLowerCase()) {
    return targetWord.toUpperCase();
  }
  
  // First letter uppercase, rest normal
  if (sourceWord[0] === sourceWord[0].toUpperCase() && sourceWord.slice(1) === sourceWord.slice(1).toLowerCase()) {
    return targetWord[0].toUpperCase() + targetWord.slice(1).toLowerCase();
  }
  
  // Default: all lowercase
  return targetWord.toLowerCase();
}

/**
 * Extracts line text from LRC line, removing all timestamp tags
 * Handles both [MM:SS.xx] and <MM:SS.xx> formats
 */
export function extractLineText(lrcLine: string): string {
  return lrcLine
    .replace(/\[\d+:\d+(?:\.\d+)?\]/g, '') // Remove line-level timestamps
    .replace(/<\d+:\d+(?:\.\d+)?>/g, '')   // Remove word-level timestamps
    .trim();
}

/**
 * Detects word-level differences between two plain text strings
 * Compares line-by-line and word-by-word to identify changes
 */
export function detectTextChanges(oldPlain: string, newPlain: string): TextChange[] {
  const oldLines = oldPlain.split('\n');
  const newLines = newPlain.split('\n');
  const changes: TextChange[] = [];

  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    const oldLine = oldLines[i] || '';
    const newLine = newLines[i] || '';

    if (oldLine === newLine) continue;

    const oldWords = oldLine.split(/\s+/).filter(w => w.length > 0);
    const newWords = newLine.split(/\s+/).filter(w => w.length > 0);

    for (let j = 0; j < Math.max(oldWords.length, newWords.length); j++) {
      const oldWord = oldWords[j] || '';
      const newWord = newWords[j] || '';

      if (oldWord !== newWord && oldWord && newWord) {
        changes.push({ oldWord, newWord, lineNumber: i });
      }
    }
  }

  return changes;
}

/**
 * Counts occurrences of a specific word in text with exact case and word boundaries
 */
export function countWordOccurrences(text: string, word: string): number {
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedWord}\\b`, 'g');
  return (text.match(regex) || []).length;
}

/**
 * Finds all line numbers (0-based) that contain a specific word
 * Strips LRC timestamps before searching for cleaner text matching
 */
export function findLinesWithWord(lrcContent: string, word: string): number[] {
  const lines = lrcContent.split('\n');
  const lineNumbers: number[] = [];

  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedWord}\\b`);

  lines.forEach((line, idx) => {
    const cleanText = extractLineText(line);
    if (regex.test(cleanText)) {
      lineNumbers.push(idx);
    }
  });

  return lineNumbers;
}

/**
 * Replaces text in LRC content while preserving all timestamp tags
 * Supports exact-case, whole-word matching
 * Can target specific lines if lineNumbers provided
 * 
 * @param lrcContent - Full LRC content with timestamps
 * @param searchText - Text to find (exact case)
 * @param replaceText - Text to replace with (case transformation applied based on source)
 * @param lineNumbers - Optional array of 0-based line numbers to update. If omitted, updates all lines.
 * @returns ReplaceResult with updated content, count, and case variant matches
 */
export function replaceLyricsInLrc(
  lrcContent: string,
  searchText: string,
  replaceText: string,
  lineNumbers?: number[]
): ReplaceResult {
  if (!lrcContent.trim() || !searchText.trim()) {
    return { updated: lrcContent, replacedCount: 0, caseMatches: [] };
  }

  const lines = lrcContent.split('\n');
  const caseMatches: Array<{ line: number; variant: string }> = [];
  let replacedCount = 0;

  // Detect case variants in the entire content
  const variants = detectCaseVariants(lrcContent, searchText);
  
  const updatedLines = lines.map((line, lineIdx) => {
    // Skip if specific lines provided and this line not in the list
    if (lineNumbers && !lineNumbers.includes(lineIdx)) {
      return line;
    }

    const lineText = extractLineText(line);
    if (!lineText) return line; // Empty line (instrumental break)

    // Find all case variants on this line
    const escapedSearch = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordBoundaryRegex = new RegExp(`\\b${escapedSearch}\\b`, 'gi');
    
    let foundOnThisLine = false;
    let match;
    while ((match = wordBoundaryRegex.exec(lineText)) !== null) {
      foundOnThisLine = true;
      const foundVariant = lineText.slice(match.index, match.index + searchText.length);
      if (!caseMatches.find(cm => cm.line === lineIdx && cm.variant === foundVariant)) {
        caseMatches.push({ line: lineIdx, variant: foundVariant });
      }
    }

    if (!foundOnThisLine) return line;

    // Replace all case variants on this line
    let updatedLine = line;
    for (const variantData of variants) {
      const variant = variantData.variant;
      const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const variantRegex = new RegExp(`\\b${escapedVariant}\\b`, 'g');
      
      const countBefore = (updatedLine.match(variantRegex) || []).length;
      const transformedReplacement = applyCaseTransformation(variant, replaceText);
      updatedLine = updatedLine.replace(variantRegex, transformedReplacement);
      const countAfter = countBefore;
      replacedCount += countAfter;
    }

    return updatedLine;
  });

  return {
    updated: updatedLines.join('\n'),
    replacedCount,
    caseMatches,
  };
}

/**
 * Counts words in plain text string
 */
function countWordsInPlain(plainText: string): number {
  return plainText
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
}

/**
 * Counts total words in synced/wordSynced LRC, excluding timestamps
 * Each line contributes its word count
 */
function countWordsInLrc(lrcContent: string): number {
  if (!lrcContent.trim()) return 0;

  return lrcContent
    .split('\n')
    .reduce((total, line) => {
      const lineText = extractLineText(line);
      const wordCount = lineText
        .split(/\s+/)
        .filter(word => word.length > 0)
        .length;
      return total + wordCount;
    }, 0);
}

/**
 * Validates that plain text and synced/wordSynced have consistent word counts
 * Allows small tolerance for instrumental breaks and formatting differences
 * 
 * @param plainText - Plain text lyrics
 * @param syncedContent - Synced LRC content (line-level or word-level)
 * @param tolerancePercent - Allowed word count difference as percentage (default 5%)
 * @returns ConsistencyCheckResult
 */
export function validateLyricsConsistency(
  plainText: string,
  syncedContent: string | null,
  tolerancePercent: number = 5
): ConsistencyCheckResult {
  const plainWordCount = countWordsInPlain(plainText);
  
  if (!syncedContent) {
    return {
      isConsistent: false,
      plainWordCount,
      syncedWordCount: 0,
      mismatchedLines: [],
      tolerance: tolerancePercent,
    };
  }

  const syncedWordCount = countWordsInLrc(syncedContent);
  
  // Calculate tolerance as absolute word count
  const tolerance = Math.ceil((plainWordCount * tolerancePercent) / 100);
  const difference = Math.abs(plainWordCount - syncedWordCount);
  const isConsistent = difference <= tolerance;

  // Find which lines might be problematic
  const lines = syncedContent.split('\n');
  const mismatchedLines: number[] = [];
  
  // Simple heuristic: empty lines in synced but not in plain could indicate problems
  let syncedLineCount = 0;
  lines.forEach((line, idx) => {
    if (extractLineText(line).length > 0) {
      syncedLineCount++;
    }
  });

  return {
    isConsistent,
    plainWordCount,
    syncedWordCount,
    mismatchedLines,
    tolerance,
  };
}

/**
 * Helper: Extracts all unique words that appear on a specific line
 * Useful for debugging or showing what changed on a line
 */
export function getWordsOnLine(lrcLine: string): string[] {
  const text = extractLineText(lrcLine);
  return text
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Helper: Gets the timestamp from an LRC line
 * Returns null if no timestamp found
 */
export function getLineTimestamp(lrcLine: string): { mins: number; secs: number; formatted: string } | null {
  const match = lrcLine.match(/\[(\d+):(\d+(?:\.\d+)?)\]/);
  if (!match) return null;
  
  const mins = parseInt(match[1], 10);
  const secs = parseFloat(match[2]);
  return {
    mins,
    secs,
    formatted: `${mins.toString().padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}`,
  };
}
