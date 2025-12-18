'use client';
import { use, useEffect, useMemo, useState } from 'react';
import SongHeader from '@/components/SongHeader';
import ActionButtons from '@/modules/lyrics/components/ActionButtons';
import RepairModal from '@/modules/lyrics/components/RepairModal';
import SyncLyricsEditor from '@/modules/lyrics/components/SyncLyricsEditor';
import { useDisplayLyrics } from '@/modules/lyrics/hooks/useDisplayLyrics';
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
      <SongHeader track={track} isPlaying={isPlaying} togglePlayback={togglePlayback} />

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-black text-2xl font-bold">Lyrics</h2>
          {displayLyrics && !editMode && !syncMode && (
            <ActionButtons
              hasSynced={hasSynced}
              hasWordSynced={hasWordSynced}
              wordSyncEnabled={wordSyncEnabled}
              showRhymes={showRhymes}
              repairing={repairing}
              onToggleWordSync={handleToggleWordSync}
              onToggleRhymes={handleToggleRhymes}
              onEditSync={() => setSyncMode(true)}
              onEditLyrics={() => setEditMode(true)}
              onRunRepair={() => setRepairModalOpen(true)}
            />
          )}
        </div>

        {isSaving && <p className="text-sm text-gray-500">Saving...</p>}
        {lyricsLoading && !savedSong && <p className="text-gray-600 animate-pulse">Searching lyrics...</p>}
        {lyricsError && !savedSong && (
          <p className="text-red-500">
            {lyricsError.includes('not found') ? 'Lyrics not available.' : `Error: ${lyricsError}`}
          </p>
        )}
        {!lyricsLoading && !displayLyrics && <p className="text-gray-500 italic">No lyrics found.</p>}

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
            initialHtml={displayHtml}
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
