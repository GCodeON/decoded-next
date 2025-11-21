'use client';
import { useState, useMemo } from 'react';
import { FaEdit, FaClock } from 'react-icons/fa';
import { useSpotifyTrack, useSavedSong, usePlaybackSync } from '@/hooks/useTrack';
import { lyricsToHtml, mapLrcToRhymeHtml } from '@/utils/lyrics';

import SongHeader from '@/components/songHeader';
import LyricsEditor from '@/components/lyricsEditor';
import SyncedLyrics from '@/components/syncedLyrics';
import SyncLyricsEditor from '@/components/syncLyricsEditor';

export default function Song({ params }: { params: { id: string } }) {
  const { track, error: trackError, loading: trackLoading } = useSpotifyTrack(params.id);
  const { savedSong, isSaving, lyricsLoading, lyricsError, updateLyrics, updateSynced } = useSavedSong(track, params.id);
  const { isPlaying, currentPosition, togglePlayback } = usePlaybackSync(params.id, !!track);

  const [editMode, setEditMode] = useState(false);
  const [syncMode, setSyncMode] = useState(false);

  const displayLyrics = useMemo(() => {
    if (savedSong?.lyrics) {
        const lyrics = { ...savedSong.lyrics };

        if (lyrics.synced && lyrics.rhymeEncoded && !lyrics.rhymeEncodedLines) {
          lyrics.rhymeEncodedLines = mapLrcToRhymeHtml(lyrics.synced, lyrics.rhymeEncoded);
        }

        if (!lyrics.rhymeEncoded) {
          lyrics.rhymeEncoded = savedSong.lyrics.rhymeEncoded || lyricsToHtml(savedSong.lyrics.plain);
        }

        return lyrics;
      }
    return null;
  }, [savedSong]);

  const hasSynced = !!displayLyrics?.synced;
  const displayHtml = displayLyrics?.rhymeEncoded || '';
  const plainLyrics = displayLyrics?.plain || '';

  // Loading & Error States
  if (trackLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading song...</p>
      </div>
    );
  }

  if (trackError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <p className="text-red-500">Error: {trackError}</p>
      </div>
    );
  }

  if (!track) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <SongHeader track={track} isPlaying={isPlaying} />

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-black text-2xl font-bold">Lyrics</h2>
          {displayLyrics && !editMode && !syncMode && (
            <div className="flex gap-4">
              {!hasSynced ? (
                <button
                  onClick={() => setSyncMode(true)}
                  className="flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold"
                >
                  <FaClock /> Sync Lyrics
                </button>
              ) : (
                <button
                  onClick={() => setSyncMode(true)}
                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold"
                >
                  <FaClock /> Edit Sync
                </button>
              )}
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <FaEdit /> Edit
              </button>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {isSaving && <p className="text-sm text-gray-500">Saving...</p>}
        {lyricsLoading && !savedSong && <p className="text-gray-600 animate-pulse">Searching lyrics...</p>}
        {lyricsError && !savedSong && (
          <p className="text-red-500">
            {lyricsError.includes('not found') ? 'Lyrics not available.' : `Error: ${lyricsError}`}
          </p>
        )}
        {!lyricsLoading && !displayLyrics && <p className="text-gray-500 italic">No lyrics found.</p>}

        {/* Sync Mode */}
        {syncMode && displayLyrics && (
          <SyncLyricsEditor
            plainLyrics={plainLyrics}
            existingLrc={displayLyrics.synced}
            currentPosition={currentPosition}
            isPlaying={isPlaying}
            togglePlayback={togglePlayback}
            onSave={(lrc) => {
              updateSynced(lrc);
              setSyncMode(false);
            }}
            onCancel={() => setSyncMode(false)}
          />
        )}

        {/* Synced View */}
        {displayLyrics && !editMode && !syncMode && hasSynced && (
          <SyncedLyrics
            syncedLyrics={displayLyrics.synced!}
            currentPosition={currentPosition}
            isPlaying={isPlaying}
            rhymeEncodedLines={displayLyrics.rhymeEncodedLines}
          />
        )}

        {/* Plain HTML View */}
        {displayLyrics && !editMode && !syncMode && !hasSynced && (
          <div className="prose prose-lg max-w-none">
            <div
              className="whitespace-pre-wrap break-words font-sans text-gray-700 leading-relaxed text-lg md:text-xl"
              dangerouslySetInnerHTML={{ __html: displayHtml }}
            />
          </div>
        )}

        {/* Editor */}
        {editMode && (
          <LyricsEditor
            initialHtml={displayHtml}
            onSave={async (html) => {
              await updateLyrics(html);
              setEditMode(false);
            }}
            onCancel={() => setEditMode(false)}
          />
        )}

        {/* LRC Format */}
        {hasSynced && !syncMode && !editMode && (
          <details className="mt-6 border-t pt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
              View synced timestamps
            </summary>
            <pre className="mt-3 text-xs font-mono text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
              {displayLyrics.synced}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}