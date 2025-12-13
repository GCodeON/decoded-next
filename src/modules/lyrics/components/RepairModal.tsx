import { useEffect, useMemo, useState } from 'react';
import SyncedLyrics from './SyncedLyrics';
import { mapLrcToRhymeHtml } from '@/modules/lyrics';
import { repairSyncedLyrics, type RepairPreview } from '@/modules/lyrics/utils/repair';
import { LyricsForDisplay } from '@/modules/lyrics/hooks/useDisplayLyrics';

export type RepairModalProps = {
  displayLyrics: LyricsForDisplay;
  displayHtml: string;
  plainLyrics: string;
  currentPositionMs: number | null;
  isPlaying: boolean;
  setToast: (msg: string | null) => void;
  onClose: () => void;
  updateSynced: (lrc: string) => Promise<void>;
  updateWordSynced: (lrc: string) => Promise<void>;
};

export default function RepairModal({
  displayLyrics,
  displayHtml,
  plainLyrics,
  currentPositionMs,
  isPlaying,
  setToast,
  onClose,
  updateSynced,
  updateWordSynced,
}: RepairModalProps) {
  const [previewShowRhymes, setPreviewShowRhymes] = useState(false);
  const [preview, setPreview] = useState<RepairPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const loadPreview = async () => {
      setLoading(true);
      try {
        const nextPreview = await repairSyncedLyrics(
          displayHtml || plainLyrics,
          displayLyrics.synced || null,
          displayLyrics.wordSynced || null
        );
        setPreview(nextPreview);
      } catch (e) {
        console.error('Repair preview failed:', e);
        setToast('Repair preview failed');
        setTimeout(() => setToast(null), 3000);
        onClose();
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [displayHtml, plainLyrics, displayLyrics.synced, displayLyrics.wordSynced, onClose, setToast]);

  const applyRepair = async () => {
    if (!preview) return;
    try {
      setApplying(true);
      if (preview.repairedSynced) {
        await updateSynced(preview.repairedSynced);
      }
      if (preview.repairedWordSynced) {
        await updateWordSynced(preview.repairedWordSynced);
      }
      setToast('✓ Sync repaired successfully');
      setTimeout(() => setToast(null), 2500);
      onClose();
      window.location.reload();
    } catch (e) {
      console.error('Apply repair failed:', e);
      setToast('✗ Apply repair failed');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setApplying(false);
    }
  };

  const previewRhymeLines = useMemo(
    () =>
      previewShowRhymes && preview
        ? mapLrcToRhymeHtml(preview.repairedSynced, displayLyrics?.rhymeEncoded || '')
        : undefined,
    [previewShowRhymes, preview?.repairedSynced, displayLyrics?.rhymeEncoded]
  );

  if (loading || !preview) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl p-6 text-center text-gray-700">
          Preparing repair preview…
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-xl shadow-xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Repair Sync Preview</h3>
          <button className="text-gray-600 hover:text-gray-900" onClick={onClose}>Close</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700">Before (Synced)</h4>
            <pre className="mt-2 text-xs font-mono text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-[40vh] overflow-auto">
              {displayLyrics?.synced || '—'}
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700">After (Synced)</h4>
            <pre className="mt-2 text-xs font-mono text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-[40vh] overflow-auto">
              {preview.repairedSynced}
            </pre>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-700">Before (Word Synced)</h4>
            <pre className="mt-2 text-xs font-mono text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-[40vh] overflow-auto">
              {displayLyrics?.wordSynced || '—'}
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700">After (Word Synced)</h4>
            <pre className="mt-2 text-xs font-mono text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-[40vh] overflow-auto">
              {preview.repairedWordSynced || '—'}
            </pre>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">Visual Preview</h4>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                className="rounded"
                checked={previewShowRhymes}
                onChange={(e) => setPreviewShowRhymes(e.target.checked)}
              />
              Show Rhymes
            </label>
          </div>
          <div className="border rounded-lg p-3 bg-gray-50 max-h-[40vh] overflow-y-auto">
            <SyncedLyrics
              syncedLyrics={preview.repairedWordSynced || preview.repairedSynced}
              currentPositionMs={currentPositionMs ?? 0}
              isPlaying={isPlaying}
              rhymeEncodedLines={previewRhymeLines}
              showRhymes={previewShowRhymes}
              mode={previewShowRhymes ? 'line' : (preview.repairedWordSynced ? 'word' : 'line')}
            />
          </div>
          <div>
            <h5 className="text-xs font-semibold text-gray-600">Repaired Lyrics (Timestamps Removed)</h5>
            <pre className="mt-2 text-xs font-mono text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded max-h-[30vh] overflow-auto">
              {(preview.repairedWordSynced || preview.repairedSynced)
                .replace(/\[(\d{2}):(\d{2}(?:\.\d{2})?)\]\s?/g, '')
                .replace(/<\d{2}:\d{2}(?:\.\d{2})?>/g, '')}
            </pre>
          </div>
        </div>

        <div className="text-sm text-gray-700 space-y-1">
          <div>Lines modified: {preview.diffSummary.linesModified.length}</div>
          <div>Lines added: {preview.diffSummary.linesAdded}</div>
          <div>Lines removed: {preview.diffSummary.linesRemoved}</div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button className="px-4 py-2 rounded border" onClick={onClose}>Cancel</button>
          <button
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={applyRepair}
            disabled={applying}
          >
            {applying ? 'Applying…' : 'Apply Repair'}
          </button>
        </div>
      </div>
    </div>
  );
}
