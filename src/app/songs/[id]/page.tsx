'use client';
import { use, useState, useMemo, useEffect } from 'react';
import { FaEdit, FaClock, FaFont } from 'react-icons/fa';
import { useSpotifyTrack, usePlaybackSync } from '@/modules/spotify';
import { useSavedSong, LyricsEditor, SyncedLyrics, lyricsToHtml, mapLrcToRhymeHtml } from '@/modules/lyrics';
import SyncLyricsEditor from '@/modules/lyrics/components/SyncLyricsEditor';
import SongHeader from '@/components/SongHeader';

export default function Song({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { track,  loading: trackLoading, error: trackError } = useSpotifyTrack(id);
  const { savedSong, isSaving, lyricsLoading, lyricsError, updateLyrics, updateSynced, updateWordSynced } = useSavedSong({track, trackId: id});
  
  const [editMode, setEditMode] = useState(false);
  const [syncMode, setSyncMode] = useState(false);
  const [wordSyncEnabled, setWordSyncEnabled] = useState(false);
  const [showRhymes, setShowRhymes] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

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
  const hasWordSynced = !!displayLyrics?.wordSynced;
  
  const isViewMode = hasSynced && !editMode && !syncMode;
  const { isPlaying, currentPosition, currentPositionMs, togglePlayback } = usePlaybackSync(id, !!track, syncMode, isViewMode);

  const syncConfig = useMemo(() => {
    if (!displayLyrics || !hasSynced) return null;
    
    const useWordSync = wordSyncEnabled && hasWordSynced;
    
    return {
      lyrics: useWordSync 
        ? displayLyrics.wordSynced! 
        : displayLyrics.wordSynced || displayLyrics.synced!,
      mode: (useWordSync ? 'word' : 'line') as 'word' | 'line',
      rhymeEncodedLines: displayLyrics.rhymeEncodedLines || undefined,
    };
  }, [displayLyrics, hasSynced, wordSyncEnabled, hasWordSynced]);

  // Listen for LrcLib publish event to show toast
  useEffect(() => {
    const onPublished = (e: Event) => {
      console.log("published synced lyrics", e);
      setToast('Synced Lyrics Published');
      setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener('lrclib:published', onPublished as EventListener);
    return () => window.removeEventListener('lrclib:published', onPublished as EventListener);
  }, []);

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
    <div className="w-full mx-auto p-6 space-y-8">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-black text-white px-4 py-2 rounded shadow-lg">
          {toast}
        </div>
      )}
      <SongHeader 
        track={track} 
        isPlaying={isPlaying} 
        togglePlayback={togglePlayback}
      />

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-black text-2xl font-bold">Lyrics</h2>
          {displayLyrics && !editMode && !syncMode && (
            <div className="flex gap-4">
              {hasSynced && (
                <button
                  onClick={() => setWordSyncEnabled(!wordSyncEnabled)}
                  className={`flex items-center gap-2 font-semibold ${
                    wordSyncEnabled
                      ? 'text-purple-600 hover:text-purple-700'
                      : 'text-gray-600 hover:text-gray-700'
                  }`}
                >
                  <FaFont /> {wordSyncEnabled ? 'Word Sync ON' : 'Word Sync'}
                </button>
              )}
              <button
                onClick={() => setShowRhymes(!showRhymes)}
                className={`flex items-center gap-2 font-semibold ${
                  showRhymes ? 'text-green-600 hover:text-green-700' : 'text-gray-600 hover:text-gray-700'
                }`}
              >
                {showRhymes ? 'Rhymes ON' : 'Rhymes OFF'}
              </button>
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
            existingWordLrc={displayLyrics.wordSynced}
            currentPosition={currentPosition}
            currentPositionMs={currentPositionMs}
            isPlaying={isPlaying}
            togglePlayback={togglePlayback}
            onSave={(lrc: string) => {
              updateSynced(lrc);
              setSyncMode(false);
            }}
            onSaveWordSync={(wordLrc: string) => {
              updateWordSynced(wordLrc);
              setSyncMode(false);
            }}
            onCancel={() => setSyncMode(false)}
          />
        )}

        {/* Synced lyrics view */}
        {syncConfig && !editMode && !syncMode && (
          <SyncedLyrics
            syncedLyrics={syncConfig.lyrics}
            currentPositionMs={currentPositionMs}
            isPlaying={isPlaying}
            rhymeEncodedLines={syncConfig.rhymeEncodedLines}
            showRhymes={showRhymes}
            mode={syncConfig.mode}
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