import { NextRequest } from 'next/server';
import crypto from 'crypto';

type PublishBody = {
  trackName: string;
  artistName: string;
  albumName: string;
  durationMs: number;
  plainLyrics?: string;
  syncedLyrics?: string;
};

const mstoSeconds = (ms: number) => Math.max(0, Math.round(ms / 1000));

const isLikelySynced = (lrc?: string) => {
  if (!lrc) return false;
  const lines = lrc.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return false;
  const timestampRe = /^\[\d{2}:\d{2}(?:\.\d{2})?]/;
  return lines.every((ln) => !ln.trim() || timestampRe.test(ln));
};

async function sha256Hex(input: string) {
  const hash = crypto.createHash('sha256');
  hash.update(input, 'utf8');
  return hash.digest('hex');
}

function hexToBigInt(hex: string) {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return BigInt('0x' + clean);
}

async function solvePow(prefix: string, targetHex: string, maxMs = 15000): Promise<string | null> {
  const target = hexToBigInt(targetHex);
  const deadline = Date.now() + maxMs;
  let i = 0;
  while (Date.now() < deadline) {
    const nonce = i.toString(16);
    const digest = await sha256Hex(prefix + nonce);
    if (hexToBigInt(digest) <= target) return nonce;
    i++;
    // yield periodically
    if ((i & 0x3fff) === 0) await new Promise((r) => setImmediate(r));
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PublishBody;
    const { trackName, artistName, albumName, durationMs, plainLyrics = '', syncedLyrics = '' } = body;

    if (!trackName || !artistName || !albumName || !durationMs) {
      return new Response(
        JSON.stringify({ ok: false, code: 'invalid_payload', message: 'trackName, artistName, albumName, durationMs required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (syncedLyrics && !isLikelySynced(syncedLyrics)) {
      return new Response(
        JSON.stringify({ ok: false, code: 'unsynced_lyrics', message: 'syncedLyrics must be fully timestamped (LRC)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const publishBody = {
      trackName,
      artistName,
      albumName,
      duration: mstoSeconds(durationMs),
      plainLyrics,
      syncedLyrics,
    };

    // 1) Request a challenge from LrcLib
    const challengeRes = await fetch('https://lrclib.net/api/request-challenge', {
      method: 'POST',
      signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(8000) : undefined,
    });
    if (!challengeRes.ok) {
      const payload = await challengeRes.text();
      return new Response(
        JSON.stringify({ ok: false, code: 'challenge_failed', status: challengeRes.status, payload }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const { prefix, target } = await challengeRes.json();
    if (!prefix || !target) {
      return new Response(
        JSON.stringify({ ok: false, code: 'invalid_challenge', message: 'Missing prefix/target' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2) Solve PoW on the server
    const nonce = await solvePow(prefix, target);
    if (!nonce) {
      return new Response(
        JSON.stringify({ ok: false, code: 'pow_timeout', message: 'Failed to find valid nonce in time' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3) Publish with token
    const token = `${prefix}:${nonce}`;
    const res = await fetch('https://lrclib.net/api/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Publish-Token': token,
        'User-Agent': 'DecodedNext/1.0 (+https://github.com/GCodeON/decoded-next)'
      },
      body: JSON.stringify(publishBody),
      signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(10_000) : undefined,
    });

    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? JSON.parse(text) : { message: text };

    console.log('server post: published lyrics', { status: res.status, payload });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ ok: false, status: res.status, payload }),
        { status: res.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, payload }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, code: 'unexpected_error', message: err?.message || 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
