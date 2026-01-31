import { NextRequest, NextResponse } from 'next/server';
import spotifyClient from '@/lib/spotify/client';
import { SpotifyArtist } from '@/modules/spotify';

// Popular artist IDs that represent a diverse mix of popular artists
const POPULAR_ARTIST_IDS = [
  '06HL4z0CvFAxyc27GXpf02', // Taylor Swift
  '3TVXtAsR1Inumwj472S9r4', // Drake
  '66CXWjxzNUsdJxJ2JdwvnR', // Ariana Grande
  '1Xyo4u8uXC1ZmMpatF05PJ', // The Weeknd
  '6eUKZXaKkcviH0Ku9w2n3V', // Ed Sheeran
  '0du5cEVh5yTK9QJze8zA0C', // Bruno Mars
  '1McMsnEElThX1knmY4oliG', // Olivia Rodrigo
  '4q3ewBCX7sLwd24euuV69X', // Bad Bunny
  '7dGJo4pcD2V6oG8kP0tJRR', // Eminem
  '6M2wZ9GZgrQXHCFfjv46we', // Dua Lipa
  '0C8ZW7ezQVs4URX5aX7Kqx', // Selena Gomez
  '6qqNVTkY8uBg9cP3Jd7DAH', // Billie Eilish
  '1uNFoZAHBGtllmzznpCI3s', // Justin Bieber
  '5K4W6rqBFWDnAN6FQUkS6x', // Kanye West
  '6vWDO969PvNqNYHIOW5v0m', // Beyoncé
  '0hCNtLu0JehylgoiP8L4Gh', // Nicki Minaj
  '4gzpq5DPGxSnKTe4SA8HAU', // Coldplay
  '7jy3rLJdDQY21OgRLCZ9sD', // Foo Fighters
  '00FQb4jTyendYWaN8pK0wa', // Lana Del Rey
  '3Nrfpe0tUJi4K4DXYWgMUX', // BTS
  '2YZyLoL8N0Wb9xBt1NhZWg', // Kendrick Lamar
  '1HY2Jd0NmPuamShAr6KMms', // Lady Gaga
  '26dSoYclwsYLMAKD3tpOr4', // Britney Spears
  '5pKCCKE2ajJHZ9KAiaK11H', // Rihanna
  '1dfeR4HaWDbWqFHLkxsg1d', // Queen
];

export async function GET(request: NextRequest) {
  try {
    const client = spotifyClient();
    
    // Fetch artist details for popular artists
    const artistPromises = POPULAR_ARTIST_IDS.slice(0, 25).map(id => 
      client.get<SpotifyArtist>(`/artists/${id}`).then((res) => res.data)
    );

    const artists = await Promise.all(artistPromises);

    return NextResponse.json({
      artists,
      total: artists.length,
    });
  } catch (error: any) {
    console.error('Error fetching popular artists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular artists', details: error.message },
      { status: 500 }
    );
  }
}
