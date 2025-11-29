import { NextRequest } from 'next/server';
import { lyricsService, isLikelySynced, mstoSeconds, PublishPayload } from '@/modules/lyrics/';

async function performBackgroundPublish(body: PublishPayload) {
  const payload = {
    trackName: body.trackName,
    artistName: body.artistName,
    albumName: body.albumName,
    duration: mstoSeconds(body.duration),
    plainLyrics: body.plainLyrics || '',
    syncedLyrics: body.syncedLyrics || '',
  };

  const logPrefix = `[LrcLib:${body.artistName}-${body.trackName}]`;
  await lyricsService.publishWithPow(payload, { logPrefix });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PublishPayload;
    const { trackName, artistName, albumName, duration, plainLyrics = '', syncedLyrics = '' } = body;

    if (!trackName || !artistName || !albumName || !duration) {
      return new Response(
        JSON.stringify({ ok: false, code: 'invalid_payload', message: 'trackName, artistName, albumName, duration required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (syncedLyrics && !isLikelySynced(syncedLyrics)) {
      return new Response(
        JSON.stringify({ ok: false, code: 'unsynced_lyrics', message: 'syncedLyrics must be fully timestamped (LRC)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Kick off background task (non-blocking)
    void performBackgroundPublish(body);

    // Return 202 immediately
    return new Response(
      JSON.stringify({ ok: true, queued: true }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, code: 'unexpected_error', message: err?.message || 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
