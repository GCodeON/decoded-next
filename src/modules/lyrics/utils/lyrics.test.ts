import test from 'node:test';
import assert from 'node:assert/strict';

import { splitLyricsIntoLines } from './lyrics';

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
