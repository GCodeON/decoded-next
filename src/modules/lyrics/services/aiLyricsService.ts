import { vowels } from '../config/rhyme-colors';

export interface AutoEncodeOptions {
  lyrics: string;
  artist?: string;
  title?: string;
  genre?: string;
  modelProvider?: 'gemini' | 'groq' | 'ollama' | 'openai';
}

export interface AutoEncodeResult {
  rhymeEncoded: string;
  rhymeEncodedLines: string[];
  providerUsed: string;
  modelUsed: string;
}

const EMPTY_LINE_SENTINEL = '[EMPTY_LYRIC_LINE]';

const splitLyricsPreservingLines = (lyrics: string): string[] =>
  lyrics.replace(/\r\n?/g, '\n').split('\n');

const buildLinePreservingInput = (lyrics: string): string =>
  splitLyricsPreservingLines(lyrics)
    .map((line, index) => `${index + 1}. ${line || EMPTY_LINE_SENTINEL}`)
    .join('\n');

const normalizeEncodedLines = (rawLines: unknown, sourceLyrics: string): string[] => {
  if (!Array.isArray(rawLines) || !rawLines.every((line) => typeof line === 'string')) {
    throw new Error('AI response did not contain a valid lines array');
  }

  const sourceLines = splitLyricsPreservingLines(sourceLyrics);
  if (rawLines.length !== sourceLines.length) {
    throw new Error(
      `AI response changed the lyric line count: expected ${sourceLines.length}, received ${rawLines.length}`
    );
  }

  return rawLines.map((line, index) => {
    const normalized = line
      .replace(/^\s*\d+\.\s*/, '')
      .replace(/^\s*\[?LINE\s*\d+\]?\s*:\s*/i, '')
      .trim();

    if (!sourceLines[index] || normalized === EMPTY_LINE_SENTINEL) return '';
    return normalized;
  });
};

/**
 * Builds the comprehensive prompt mapping the 22 IPA vowel categories and hex colors
 */
export const buildRhymeEncodingPrompt = (artist?: string, title?: string, lineCount?: number): string => {
  const vowelList = Object.entries(vowels)
    .map(([cat, group]) => {
      const items = Object.entries(group)
        .map(([symbol, info]) => `  - IPA /${symbol}/ (${info.label}): background-color: ${info.color}`)
        .join('\n');
      return `### ${cat}:\n${items}`;
    })
    .join('\n\n');

  return `You are an elite music lyricist and phonetic rhyme encoder for hip-hop, R&B, and pop music.
Your task is to analyze the musical delivery of lyrics by artist "${artist || 'the artist'}" (song: "${title || 'Track'}") and encode all rhyming vowel sounds into HTML <span> tags with the exact hex colors specified below.

IMPORTANT PHONETIC RULES:
1. Focus on HOW THE ARTIST DELIVERS THE WORDS in musical cadence, including:
   - Slant rhymes & assonance (vowel bending, e.g. "time" / "shine", "hard" / "rock")
   - Multi-syllable rhyme schemes (e.g. "pack heat" / "back street")
   - Internal rhymes within bars as well as end rhymes
2. Each rhyming vowel sound in a word must be wrapped in a <span style="background-color:HEX;color:#fff" data-vowel="IPA">...</span>.
   If the background color is bright/light (such as #f1f1f1, #ffe400, #abf200, #00d8ff, #ffa7a7, #e8d9ff, #b2ccff), set color:#000 instead of #fff.
3. Non-rhyming words/syllables should remain plain text with NO spans.
4. Output MUST preserve the exact line breaks of the input lyrics.

VOWEL PALETTE & EXACT HEX CODES:
${vowelList}

OUTPUT FORMAT:
Return ONLY a valid JSON object with a single key "lines", which is an array of strings.
The array MUST contain exactly ${lineCount ?? 'the same number as the numbered input lines'} items, in the same order as the numbered input lines.
Return an empty string for an input line containing ${EMPTY_LINE_SENTINEL}.
Do not merge, split, reorder, omit, or renumber lines. Do not include line numbers in the returned strings.
Example format:
{
  "lines": [
    "<span style=\\"background-color:#bd2d67;color:#fff\\" data-vowel=\\"aɪ\\">Sky</span> is the limit and you <span style=\\"background-color:#ffa7a7;color:#000\\" data-vowel=\\"eɪ\\">know</span> that you can <span style=\\"background-color:#bd2d67;color:#fff\\" data-vowel=\\"aɪ\\">shine</span>",
    "Just <span style=\\"background-color:#ffa7a7;color:#000\\" data-vowel=\\"eɪ\\">glow</span> with the <span style=\\"background-color:#bd2d67;color:#fff\\" data-vowel=\\"aɪ\\">flow</span> and you'll <span style=\\"background-color:#ffa7a7;color:#000\\" data-vowel=\\"eɪ\\">grow</span> in <span style=\\"background-color:#bd2d67;color:#fff\\" data-vowel=\\"aɪ\\">time</span>"
  ]
}`;
};

/**
 * Call Free Google Gemini Flash API
 */
async function callGemini(
  prompt: string,
  lyrics: string,
  apiKey: string
): Promise<{ lines: string[]; model: string }> {
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { text: `LYRICS TO ENCODE (preserve every numbered line):\n${buildLinePreservingInput(lyrics)}` },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Gemini API');

  const parsed = JSON.parse(rawText);
  console.log("GEMINI prompt response:", parsed);
  return { lines: normalizeEncodedLines(parsed.lines, lyrics), model };
}

/**
 * Call Free Groq API (Llama 3.3 70B / Llama 3.1 8B)
 */
async function callGroq(
  prompt: string,
  lyrics: string,
  apiKey: string
): Promise<{ lines: string[]; model: string }> {
  const model = 'llama-3.3-70b-versatile';
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `LYRICS TO ENCODE (preserve every numbered line):\n${buildLinePreservingInput(lyrics)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from Groq API');

  const parsed = JSON.parse(content);
  return { lines: normalizeEncodedLines(parsed.lines, lyrics), model };
}

/**
 * Call Local Ollama (Free Local Model e.g. Llama 3.2 / Qwen 2.5)
 */
async function callOllama(
  prompt: string,
  lyrics: string,
  baseUrl = 'http://127.0.0.1:11434'
): Promise<{ lines: string[]; model: string }> {
  const model = process.env.OLLAMA_MODEL || 'llama3.2';
  const url = `${baseUrl.replace(/\/$/, '')}/api/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `LYRICS TO ENCODE (preserve every numbered line):\n${buildLinePreservingInput(lyrics)}` },
      ],
      format: 'json',
      stream: false,
      options: { temperature: 0.2 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data?.message?.content;
  if (!content) throw new Error('Empty response from Ollama');

  const parsed = JSON.parse(content);
  return { lines: normalizeEncodedLines(parsed.lines, lyrics), model: `ollama:${model}` };
}

/**
 * Call OpenAI or Azure OpenAI Endpoint
 */
async function callOpenAI(
  prompt: string,
  lyrics: string,
  apiKey: string,
  endpoint?: string
): Promise<{ lines: string[]; model: string }> {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const url = endpoint || 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `LYRICS TO ENCODE (preserve every numbered line):\n${buildLinePreservingInput(lyrics)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from OpenAI API');

  const parsed = JSON.parse(content);
  return { lines: normalizeEncodedLines(parsed.lines, lyrics), model };
}

/**
 * Main function: Automatically rhyme-encode plain lyrics using available free/cloud AI
 */
export const autoEncodeLyrics = async (options: AutoEncodeOptions): Promise<AutoEncodeResult> => {
  const { lyrics, artist, title, modelProvider } = options;
  if (!lyrics || !lyrics.trim()) {
    throw new Error('No lyrics provided for encoding');
  }

  const prompt = buildRhymeEncodingPrompt(artist, title, splitLyricsPreservingLines(lyrics).length);

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const ollamaUrl = process.env.OLLAMA_BASE_URL;

  let lines: string[] = [];
  let providerUsed = '';
  let modelUsed = '';

  // Determine provider by priority or explicit option
  if (modelProvider === 'gemini' || (!modelProvider && geminiKey)) {
    if (!geminiKey) throw new Error('GEMINI_API_KEY environment variable is missing');
    const result = await callGemini(prompt, lyrics, geminiKey);
    lines = result.lines;
    providerUsed = 'gemini';
    modelUsed = result.model;
  } else if (modelProvider === 'groq' || (!modelProvider && groqKey)) {
    if (!groqKey) throw new Error('GROQ_API_KEY environment variable is missing');
    const result = await callGroq(prompt, lyrics, groqKey);
    lines = result.lines;
    providerUsed = 'groq';
    modelUsed = result.model;
  } else if (modelProvider === 'ollama' || (!modelProvider && ollamaUrl)) {
    const result = await callOllama(prompt, lyrics, ollamaUrl);
    lines = result.lines;
    providerUsed = 'ollama';
    modelUsed = result.model;
  } else if (modelProvider === 'openai' || (!modelProvider && openaiKey)) {
    if (!openaiKey) throw new Error('OPENAI_API_KEY environment variable is missing');
    const result = await callOpenAI(prompt, lyrics, openaiKey, process.env.OPENAI_BASE_URL);
    lines = result.lines;
    providerUsed = 'openai';
    modelUsed = result.model;
  } else {
    // Fallback Mock Encoder when no API keys are configured (for local testing/demos)
    const rawLines = splitLyricsPreservingLines(lyrics);
    lines = rawLines.map((line) => {
      // Basic mock highlighting to demonstrate color mapping without crashing
      return line.replace(/\b(\w+ing|\w+ight|\w+ow|\w+ay|\w+ee|\w+all)\b/gi, (match) => {
        return `<span style="background-color:#bd2d67;color:#fff" data-vowel="aɪ">${match}</span>`;
      });
    });
    providerUsed = 'local-heuristic-fallback';
    modelUsed = 'phonetic-rule-engine';
  }

  // Newline characters collapse in HTML. Use real break elements so editors
  // and unsynced lyric views retain the same line structure as the input.
  const rhymeEncoded = `<p>${lines.join('<br>')}</p>`;

  return {
    rhymeEncoded,
    rhymeEncodedLines: lines,
    providerUsed,
    modelUsed,
  };
};
