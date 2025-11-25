import { NextRequest } from 'next/server';
import { LyricsResponse, LrcLibData } from '@/features/lyrics';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get('artist');
  const song = searchParams.get('song');
  const album = searchParams.get('album');
  const duration = searchParams.get('duration');

  if (!artist || !song) {
    return new Response(
      JSON.stringify({ error: 'artist and song required' }),
      { status: 400 }
    );
  }

  const title = `${artist} - ${song}`;

  const safeFetch = async (url: string): Promise<Response | null> => {
    try {
      return await fetch(url, { signal: AbortSignal.timeout(8_000) });
    } catch {
      return null;
    }
  };

  const buildResponse = (plain: string | null, synced: string | null): Response =>
    new Response(
      JSON.stringify({ title, lyrics: { plain, synced } } satisfies LyricsResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  let foundViaLrcLib = false;
  let lrcNotFound = false;


  if (album && duration) {
    const lrcUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(
      artist
    )}&track_name=${encodeURIComponent(song)}&album_name=${encodeURIComponent(
      album
    )}&duration=${encodeURIComponent(duration)}`;

    const lrcRes = await safeFetch(lrcUrl);

    if (lrcRes?.ok) {
      const data: LrcLibData = await lrcRes.json();
      const synced = data.syncedLyrics?.trim() || null;
      const plain = data.plainLyrics?.trim() || null;

      if (synced || plain) {
        foundViaLrcLib = true;
        return buildResponse(plain, synced);
      }
    } else if (lrcRes?.status === 404) {
      lrcNotFound = true;
    }
    // else: network error → still try fallback
  }

  const ovhUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`;
  const ovhRes = await safeFetch(ovhUrl);

  if (ovhRes?.ok) {
    const { lyrics } = await ovhRes.json();
    const plain = lyrics?.trim() || null;
    return buildResponse(plain, null);
  }


  const ovhNotFound = ovhRes?.status === 404;
  const anyNotFound = lrcNotFound || ovhNotFound;

  if (anyNotFound) {
    return new Response(
      JSON.stringify({ error: 'Lyrics not found' }),
      { status: 404 }
    );
  }

  return new Response(
    JSON.stringify({ error: 'Service unavailable' }),
    { status: 500 }
  );
}