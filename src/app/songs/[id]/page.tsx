'use client';
import { use, useEffect, useMemo, useState } from 'react';
import SongHeader from '@/components/SongHeader';
import ActionButtons from '@/modules/lyrics/components/ActionButtons';
import SyncLyricsEditor from '@/modules/lyrics/components/SyncLyricsEditor';
import { Toast } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { useDisplayLyrics } from '@/modules/lyrics/hooks/useDisplayLyrics';
import { useHasRhymeColors } from '@/modules/lyrics/hooks/useHasRhymeColors';
import { usePageScroll } from '@/modules/lyrics/hooks/usePageScroll';
import { LyricsEditor, SyncedLyrics, useSavedSong } from '@/modules/lyrics';
import { usePlaybackSync, useSpotifyTrack } from '@/modules/spotify';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Song({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { track, loading: trackLoading, error: trackError } = useSpotifyTrack(id);
  const { savedSong, isSaving, lyricsLoading, lyricsError, updateLyrics, updateSynced, updateWordSynced } = useSavedSong({ track, trackId: id });

  const [editMode, setEditMode] = useState(false);
  const [syncMode, setSyncMode] = useState(false);
  const [wordSyncEnabled, setWordSyncEnabled] = useState(false);
  const [showRhymes, setShowRhymes] = useState(true);
  const [lastActiveLine, setLastActiveLine] = useState<number | null>(null);

  const { toast, show: showToast } = useToast();

  const displayLyrics = useDisplayLyrics(savedSong);
  const hasRhymeColors = useHasRhymeColors(displayLyrics);

  const hasSynced = !!displayLyrics?.synced;
  const hasWordSynced = !!displayLyrics?.wordSynced;

  useEffect(() => {
    if (hasWordSynced) {
      setWordSyncEnabled(true);
    }
  }, [hasWordSynced]);

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

  useEffect(() => {
    const onPublished = (e: Event) => {
      console.log('published synced lyrics', e);
      showToast('Synced Lyrics Published', 3000);
    };
    window.addEventListener('lrclib:published', onPublished as EventListener);
    return () => window.removeEventListener('lrclib:published', onPublished as EventListener);
  }, [showToast]);

  const displayHtml = displayLyrics?.rhymeEncoded || '';
  const plainLyrics = displayLyrics?.plain || '';

  const handleToggleWordSync = () => setWordSyncEnabled(prev => !prev);
  const handleToggleRhymes = () => setShowRhymes(prev => !prev);

  usePageScroll({
    activeLineIndex: lastActiveLine,
    lyricsContainerId: 'synced-lyrics-container',
    viewportOffset: {
      mobile: 55,
      desktop: 66,
    },
  });

  if (trackLoading) {
    return <LoadingSpinner message="Loading song..." fullHeight />;
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
    <div className="w-full mx-auto p-1 md:p-6 space-y-1 md:space-y-8 relative">
      <Toast message={toast?.message || null} />
      
      <div className="bg-black rounded-tl-xl rounded-tr-xl shadow-lg p-2 md:p-6 mb-0">
        <SongHeader 
          track={track} 
          isPlaying={isPlaying} 
          togglePlayback={togglePlayback}
        />
      </div>

      <div className="sticky top-0 z-10 bg-black shadow-lg p-1 md:p-2 mb-2">
        <div className="flex justify-around items-center">
          {!editMode && !syncMode && (
            <ActionButtons
              hasSynced={hasSynced}
              hasWordSynced={hasWordSynced}
              wordSyncEnabled={wordSyncEnabled}
              hasRhymeColors={hasRhymeColors}
              showRhymes={showRhymes}
              hasLyrics={!!displayLyrics}
              lyricsLoading={lyricsLoading}
              onToggleWordSync={handleToggleWordSync}
              onToggleRhymes={handleToggleRhymes}
              onEditSync={() => setSyncMode(true)}
              onEditLyrics={() => setEditMode(true)}
            />
          )}
        </div>

        {isSaving && <p className="text-sm text-gray-500 mt-2">Saving...</p>}
        {lyricsLoading && !savedSong && <p className="text-gray-600 animate-pulse mt-2">Searching lyrics...</p>}
        {lyricsError && !savedSong && !editMode && (
          <p className="text-red-500 mt-2">
            {lyricsError.includes('not found') ? 'Lyrics not available.' : `Error: ${lyricsError}`}
          </p>
        )}
      </div>

      <div className="space-y-8">

        {syncMode && displayLyrics && (
          <SyncLyricsEditor
            plainLyrics={plainLyrics}
            existingLrc={displayLyrics.synced}
            existingWordLrc={displayLyrics.wordSynced}
            currentPosition={currentPosition}
            currentPositionMs={currentPositionMs}
            isPlaying={isPlaying}
            togglePlayback={togglePlayback}
            initialActiveLine={lastActiveLine}
            displayLyrics={displayLyrics}
            displayHtml={displayHtml}
            updateSynced={updateSynced}
            updateWordSynced={updateWordSynced}
            showToast={showToast}
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

        {syncConfig && !editMode && !syncMode && (
          <SyncedLyrics
            syncedLyrics={syncConfig.lyrics}
            currentPositionMs={currentPositionMs ?? 0}
            isPlaying={isPlaying}
            rhymeEncodedLines={syncConfig.rhymeEncodedLines}
            showRhymes={showRhymes}
            mode={syncConfig.mode}
            onActiveLineChange={setLastActiveLine}
            containerId="synced-lyrics-container"
          />
        )}

        {displayLyrics && !editMode && !syncMode && !hasSynced && (
          <div className="prose prose-lg max-w-none">
            <div
              className="whitespace-pre-wrap break-words font-sans text-gray-700 leading-relaxed text-lg md:text-xl text-white dark:text-gray-300 bg-white dark:bg-gray-900 p-4 rounded"
              dangerouslySetInnerHTML={{ __html: displayHtml }}
            />
          </div>
        )}

        {editMode && (
          <LyricsEditor
            initialHtml={displayHtml || ''}
            onSave={async (html) => {
              await updateLyrics(html);
              setEditMode(false);
            }}
            onCancel={() => setEditMode(false)}
          />
        )}

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
