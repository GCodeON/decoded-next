import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get('artist');
  const song = searchParams.get('song');

  if (!artist || !song) {
    return new Response(JSON.stringify({ error: 'artist and song required' }), {
      status: 400,
    });
  }

  try {
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`
    );

    if (!res.ok) {
      if (res.status === 404) {
        return new Response(JSON.stringify({ error: 'Lyrics not found' }), { status: 404 });
      }
      throw new Error('Failed to fetch');
    }

    const { lyrics } = await res.json();

    return new Response(
      JSON.stringify({
        title: `${artist} - ${song}`,
        lyrics: lyrics || 'No lyrics available.',
      }),
      { status: 200 }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), { status: 500 });
  }
}