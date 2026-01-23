'use client';
import { use, useEffect, useMemo, useState } from 'react';
import SongHeader from '@/components/SongHeader';
import ActionButtons from '@/modules/lyrics/components/ActionButtons';
import RepairModal from '@/modules/lyrics/components/RepairModal';
import SyncLyricsEditor from '@/modules/lyrics/components/SyncLyricsEditor';
import { useDisplayLyrics } from '@/modules/lyrics/hooks/useDisplayLyrics';
import { usePageScroll } from '@/modules/lyrics/hooks/usePageScroll';
import { LyricsEditor, SyncedLyrics, useSavedSong } from '@/modules/lyrics';
import { usePlaybackSync, useSpotifyTrack } from '@/modules/spotify';

export default function Song({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { track, loading: trackLoading, error: trackError } = useSpotifyTrack(id);
  const { savedSong, isSaving, lyricsLoading, lyricsError, updateLyrics, updateSynced, updateWordSynced } = useSavedSong({ track, trackId: id });

  const [editMode, setEditMode] = useState(false);
  const [syncMode, setSyncMode] = useState(false);
  const [wordSyncEnabled, setWordSyncEnabled] = useState(false);
  const [showRhymes, setShowRhymes] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [lastActiveLine, setLastActiveLine] = useState<number | null>(null);

  const displayLyrics = useDisplayLyrics(savedSong);

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

  useEffect(() => {
    const onPublished = (e: Event) => {
      console.log('published synced lyrics', e);
      setToast('Synced Lyrics Published');
      setTimeout(() => setToast(null), 3000);
    };
    window.addEventListener('lrclib:published', onPublished as EventListener);
    return () => window.removeEventListener('lrclib:published', onPublished as EventListener);
  }, []);

  const displayHtml = displayLyrics?.rhymeEncoded || '';
  const plainLyrics = displayLyrics?.plain || '';

  const handleToggleWordSync = () => setWordSyncEnabled(prev => !prev);
  const handleToggleRhymes = () => setShowRhymes(prev => !prev);

  usePageScroll({
    activeLineIndex: lastActiveLine,
    lyricsContainerId: 'synced-lyrics-container',
    viewportOffset: {
      mobile: 45,
      desktop: 66,
    },
  });

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
    <div className="w-full mx-auto p-1 md:p-6 space-y-1 md:space-y-8 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-black text-white px-4 py-2 rounded shadow-lg">
          {toast}
        </div>
      )}
      <div className="bg-white rounded-tl-xl rounded-tr-xl shadow-lg p-6 mb-0">
        <SongHeader track={track} isPlaying={isPlaying} togglePlayback={togglePlayback}/>
      </div>

      <div className="sticky top-0 z-10 bg-white shadow-lg p-2 md:p-6 mb-0">
        <div className="flex justify-around items-center">
          {/* <h2 className="text-black text-2xl font-bold">Lyrics</h2> */}
          {!editMode && !syncMode && (
            <ActionButtons
              hasSynced={hasSynced}
              hasWordSynced={hasWordSynced}
              wordSyncEnabled={wordSyncEnabled}
              showRhymes={showRhymes}
              repairing={repairing}
              hasLyrics={!!displayLyrics}
              lyricsLoading={lyricsLoading}
              onToggleWordSync={handleToggleWordSync}
              onToggleRhymes={handleToggleRhymes}
              onEditSync={() => setSyncMode(true)}
              onEditLyrics={() => setEditMode(true)}
              onRunRepair={() => setRepairModalOpen(true)}
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
              className="whitespace-pre-wrap break-words font-sans text-gray-700 leading-relaxed text-lg md:text-xl"
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

        {repairModalOpen && displayLyrics && (
          <RepairModal
            displayLyrics={displayLyrics}
            displayHtml={displayHtml}
            plainLyrics={plainLyrics}
            currentPositionMs={currentPositionMs}
            isPlaying={isPlaying}
            setToast={setToast}
            onClose={() => setRepairModalOpen(false)}
            updateSynced={updateSynced}
            updateWordSynced={updateWordSynced}
          />
        )}
      </div>
    </div>
  );
}
