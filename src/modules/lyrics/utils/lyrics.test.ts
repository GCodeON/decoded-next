import test from 'node:test';
import assert from 'node:assert/strict';

import { splitLyricsIntoLines } from './lyrics';
import { matchLrcToPlainLines } from './lrc';
import { repairLineSyncedLyrics } from './repair';

test('ignores fragment-heavy fallback lines when plain lyrics are a single paragraph', () => {
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

  assert.equal(result.length, 1);
  assert.equal(result[0], plain.trim());
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
