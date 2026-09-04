import test from 'node:test';
import assert from 'node:assert/strict';

import { mapLrcToRhymeHtml, splitLyricsIntoLines } from './lyrics';
import { matchLrcToPlainLines } from './lrc';
import { repairLineSyncedLyrics } from './repair';
import { sanitizeEnhancedLrcOutput } from './lrcAdvanced';

test('uses explicit fallback line breaks when plain lyrics are a single paragraph', () => {
  const plain = 'J-J-J-JID D-D-D-D D-D-D-D D-D-D, d-damn, said I\'m back again To whoop ass, the blicka blast from the ratchet, man';

  const fallback = [
    'J-J-J-JID',
    'D-D-D-D',
    'D-D-D-D',
    'D-D-D, d-damn, said I\'m back again',
    'To whoop ass, the blicka blast from the ratchet, man',
    'The maddest, blackest',
    'lad in a savage',
    'land',
    'Of grab and dash and crash in your daddy\'s van',
  ];

  const result = splitLyricsIntoLines(plain, undefined, fallback);

  assert.deepEqual(result, fallback);
});

test('splits merged lyric fragments around lowercase-to-uppercase transitions', () => {
  const plain = "Skrrtin', skrrtin', skrrtin', servin', servin', servin'Everything I done, it comes full circle";

  const result = splitLyricsIntoLines(plain);

  assert.deepEqual(result, [
    "Skrrtin', skrrtin', skrrtin', servin', servin', servin'",
    'Everything I done, it comes full circle',
  ]);
});

test('preserves a timestamp when a synced lyric line is split into fragments', () => {
  const result = matchLrcToPlainLines(
    ["Sh- gon' get hard, keep your head strong", "If I quit now, then I'm dead wrong"],
    [
      { time: 41.31, text: "Sh- gon' get hard, keep your head" },
      { time: 48.55, text: 'strong' },
      { time: 55.79, text: "If I quit now, then I'm dead" },
      { time: 63.03, text: 'wrong' },
    ]
  );

  assert.deepEqual(result, [41.31, 55.79]);
});

test('rebuilds split synced lines from canonical rhyme HTML', () => {
  const repaired = repairLineSyncedLyrics(
    "<p>Sh- gon' get hard, keep your <span>head</span> <span>strong</span><br>If I quit now, then I'm <span>dead</span> <span>wrong</span></p>",
    "[00:41.31] Sh- gon' get hard, keep your head\n[00:48.55] strong\n[00:55.79] If I quit now, then I'm dead\n[01:03.03] wrong"
  );

  assert.equal(
    repaired,
    "[00:41.31] Sh- gon' get hard, keep your head strong\n[00:55.79] If I quit now, then I'm dead wrong"
  );
});

test('maps newline-free synced LRC entries to separate rhyme lines', () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: () => {
      let html = '';
      return {
        get innerHTML() {
          return html;
        },
        set innerHTML(value: string) {
          html = value;
        },
      } as HTMLDivElement;
    },
  } as unknown as Document;

  try {
    const result = mapLrcToRhymeHtml(
      "[01:44.00] Skrrtin', skrrtin', skrrtin', servin', servin', servin' [01:46.00] Everything I done, it comes full circle",
      '<div>Skrrtin\', skrrtin\', skrrtin\', servin\', servin\', servin\'<br>Everything I done, it comes full circle</div>'
    );

    assert.deepEqual(result, [
      "Skrrtin', skrrtin', skrrtin', servin', servin', servin'",
      'Everything I done, it comes full circle',
    ]);
  } finally {
    globalThis.document = previousDocument;
  }
});

test('does not merge rhyme lines across paragraph and div boundaries', () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: () => {
      let html = '';
      return {
        get innerHTML() {
          return html;
        },
        set innerHTML(value: string) {
          html = value;
        },
      } as HTMLDivElement;
    },
  } as unknown as Document;

  try {
    const result = mapLrcToRhymeHtml(
      "[00:05.00] J-J-J-JID [00:10.00] D-D-D-D [00:13.00] D-D-D-D",
      '<p>J-J-J-JID</p><div>D-D-D-D<br>D-D-D-D</div>'
    );

    assert.deepEqual(result, ['J-J-J-JID', 'D-D-D-D', 'D-D-D-D']);
  } finally {
    globalThis.document = previousDocument;
  }
});

test('uses canonical HTML positions for repaired rhyme previews', () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: () => {
      let html = '';
      return {
        get innerHTML() {
          return html;
        },
        set innerHTML(value: string) {
          html = value;
        },
      } as HTMLDivElement;
    },
  } as unknown as Document;

  try {
    const result = mapLrcToRhymeHtml(
      '[00:05.00] Corrected first line\n[00:10.00] Corrected second line',
      '<p><span>Original first line</span></p><div><span>Original second line</span></div>'
    );

    assert.deepEqual(result, [
      '<span>Original first line</span>',
      '<span>Original second line</span>',
    ]);
  } finally {
    globalThis.document = previousDocument;
  }
});

test('preserves word timings when sanitizing word-synced LRC', () => {
  const result = sanitizeEnhancedLrcOutput(
    '[00:05.00]<00:05.10>J-J-J-JID <00:05.60>D-D-D-D'
  );

  assert.match(result || '', /<00:05\.10>J-J-J-JID/);
  assert.match(result || '', /<00:05\.60>D-D-D-D/);
});
