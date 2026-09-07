import { NextRequest, NextResponse } from 'next/server';
import { autoEncodeLyrics } from '@/modules/lyrics/services/aiLyricsService';
import { computeLyricalQuantification } from '@/modules/lyrics/utils/quantification';
import { splitLyricsIntoLines } from '@/modules/lyrics/utils/lyrics';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackId, artist, title, lyrics, syncedLyrics, modelProvider } = body;

    if (!lyrics || typeof lyrics !== 'string' || !lyrics.trim()) {
      return NextResponse.json(
        { error: 'lyrics parameter is required and must be non-empty' },
        { status: 400 }
      );
    }

    // Call the AI auto-encoder
    const encodeResult = await autoEncodeLyrics({
      lyrics,
      artist,
      title,
      modelProvider,
    });

    // Extract lines cleanly matching split logic
    const lines = encodeResult.rhymeEncodedLines.length > 0
      ? encodeResult.rhymeEncodedLines
      : splitLyricsIntoLines(lyrics, encodeResult.rhymeEncoded);

    // Compute Lyrical Quantification
    const quantification = computeLyricalQuantification({
      rhymeEncodedLines: lines,
      syncedLyrics,
      trackId,
      artist,
      title,
    });

    return NextResponse.json({
      success: true,
      rhymeEncoded: encodeResult.rhymeEncoded,
      rhymeEncodedLines: lines,
      providerUsed: encodeResult.providerUsed,
      modelUsed: encodeResult.modelUsed,
      quantification,
    });
  } catch (error: any) {
    console.error('Error in /api/lyrics/auto-encode:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to auto-encode lyrics' },
      { status: 500 }
    );
  }
}
