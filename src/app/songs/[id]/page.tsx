'use client';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaExpand } from 'react-icons/fa';
import PresentationModeView from './PresentationModeView';
import SongHeader from '@/components/SongHeader';
import ActionButtons from '@/modules/lyrics/components/ActionButtons';
import SyncLyricsEditor from '@/modules/lyrics/components/SyncLyricsEditor';
import { Toast } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { useDisplayLyrics } from '@/modules/lyrics/hooks/useDisplayLyrics';
import { useHasRhymeColors } from '@/modules/lyrics/hooks/useHasRhymeColors';
import { usePageScroll } from '@/modules/lyrics/hooks/usePageScroll';
import { useSeekToLine } from '@/modules/lyrics/hooks/useSeekToLine';
import { LyricsEditor, SyncedLyrics, useSavedSong, songService } from '@/modules/lyrics';
import { usePlaybackSync, useSpotifyTrack } from '@/modules/spotify';
import { useSpotifyPlayer } from '@/modules/player';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useUser } from '@/modules/auth';
import useAuth from '@/modules/auth/hooks/useAuth';

export default function Song({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [adminControlsHidden, setAdminControlsHidden] = useState(false);
  const [leadAdjustmentSec, setLeadAdjustmentSec] = useState(0);
  const leadSaveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const youtubeSaveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const { track, loading: trackLoading, error: trackError } = useSpotifyTrack(id);
  const { user } = useUser();
  const { isAuthenticated, isChecking } = useAuth();
  const { deviceId, globalTrackId, webLastTrack } = useSpotifyPlayer();
  const canWrite = !!user;
  const { savedSong, isSaving, lyricsLoading, lyricsError, updateLyrics, updateSynced, updateWordSynced } = useSavedSong({ track, trackId: id, allowWrite: canWrite });

  const [hasSpotifyToken, setHasSpotifyToken] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [syncMode, setSyncMode] = useState(false);
  const [wordSyncEnabled, setWordSyncEnabled] = useState(false);
  const [showRhymes, setShowRhymes] = useState(true);
  const [rhymeColorMappingComplete, setRhymeColorMappingComplete] = useState(false);
  const [lastActiveLine, setLastActiveLine] = useState<number | null>(null);
  const [disableAutoScroll, setDisableAutoScroll] = useState(false);
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const { toast, show: showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const displayLyrics = useDisplayLyrics(savedSong);
  const hasRhymeColors = useHasRhymeColors(displayLyrics);

  const hasSynced = !!displayLyrics?.synced;
  const hasWordSynced = !!displayLyrics?.wordSynced;

  // useEffect(() => {
  //   if (hasWordSynced) {
  //     setWordSyncEnabled(true);
  //   }
  // }, [hasWordSynced]);

  useEffect(() => {
    setRhymeColorMappingComplete(!!savedSong?.lyrics?.rhymeColorMappingComplete);
    if (savedSong?.leadAdjustmentMs !== undefined) {
      setLeadAdjustmentSec(savedSong.leadAdjustmentMs / 1000);
    }
    setYoutubeUrl(savedSong?.youtubeUrl || '');
  }, [savedSong?.lyrics?.rhymeColorMappingComplete, savedSong?.leadAdjustmentMs, savedSong?.youtubeUrl]);

  const isViewMode = hasSynced && !editMode && !syncMode;
  const { isPlaying, currentPosition, currentPositionMs, togglePlayback, seekTo } = usePlaybackSync(id, !!track, syncMode, isViewMode);
  const isTrackActive = globalTrackId ? globalTrackId === id : webLastTrack === id;

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
    return () => {
      window.removeEventListener('lrclib:published', onPublished as EventListener);
      cleanupSeek();
    };
  }, [showToast]);

  const displayHtml = displayLyrics?.rhymeEncoded || '';
  const plainLyrics = displayLyrics?.plain || '';

  const handleToggleWordSync = () => setWordSyncEnabled(prev => !prev);
  const handleToggleRhymes = () => setShowRhymes(prev => !prev);

  const canShowWordSyncToggle = hasSpotifyToken && !!deviceId;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('presentation-mode-change', { detail: { enabled: isPresentationMode } }));
  }, [isPresentationMode]);

  useEffect(() => {
    if (isChecking) return;
    if (!isAuthenticated) {
      setHasSpotifyToken(false);
      return;
    }

    let mounted = true;
    fetch('/api/auth/token', { credentials: 'include' })
      .then((res) => {
        if (!mounted) return;
        setHasSpotifyToken(res.ok);
      })
      .catch(() => {
        if (mounted) setHasSpotifyToken(false);
      });

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isChecking]);

  useEffect(() => {
    if (isPresentationMode) return;
    const threshold = 48;
    const updateCompact = () => {
      const container = document.getElementById('content-scroll-container');
      const scrollTop = container ? container.scrollTop : window.scrollY;
      setIsHeaderCompact(scrollTop > threshold);
    };

    updateCompact();

    const container = document.getElementById('content-scroll-container');
    if (container) {
      container.addEventListener('scroll', updateCompact, { passive: true });
      return () => container.removeEventListener('scroll', updateCompact);
    }

    window.addEventListener('scroll', updateCompact, { passive: true });
    return () => window.removeEventListener('scroll', updateCompact);
  }, [isPresentationMode]);
  
  const handleToggleRhymeComplete = async () => {
    const newValue = !rhymeColorMappingComplete;
    setRhymeColorMappingComplete(newValue);
    
    try {
      await songService.updateRhymeColorMappingComplete(id, newValue);
      showToast(newValue ? 'Marked as Complete' : 'Marked as Incomplete', 2000);
    } catch (err) {
      console.error('Failed to update mapping status:', err);
      // Revert on error
      setRhymeColorMappingComplete(!newValue);
      showToast('Failed to update status', 2000);
    }
  };

  const { handleSeekToLine, cleanup: cleanupSeek } = useSeekToLine({
    seekTo,
    togglePlayback,
    isPlaying,
    onDisableAutoScroll: setDisableAutoScroll,
    leadAdjustmentMs: 150,
    reEnableDelayMs: 3000,
  });

  useEffect(() => {
    const onPublished = (e: Event) => {
      console.log('published synced lyrics', e);
      showToast('Synced Lyrics Published', 3000);
    };
    window.addEventListener('lrclib:published', onPublished as EventListener);
    return () => {
      window.removeEventListener('lrclib:published', onPublished as EventListener);
      cleanupSeek();
    };
  }, [showToast, cleanupSeek]);

  const handleUserScroll = () => {
    // User is manually scrolling, disable auto scroll
    setDisableAutoScroll(true);
    
    if (scrollDebounceRef.current) {
      clearTimeout(scrollDebounceRef.current);
    }
    
    // Re-enable auto scroll after user stops scrolling for 2 seconds
    scrollDebounceRef.current = setTimeout(() => {
      setDisableAutoScroll(false);
    }, 2000);
  };

  const togglePresentationMode = useCallback(() => {
    setIsPresentationMode(prev => !prev);
  }, []);

  // Debounced save of lead adjustment to Firestore
  useEffect(() => {
    if (!isAdmin || leadAdjustmentSec === undefined) return;

    if (leadSaveDebounceRef.current) {
      clearTimeout(leadSaveDebounceRef.current);
    }

    leadSaveDebounceRef.current = setTimeout(async () => {
      try {
        await songService.updateLeadAdjustment(id, Math.round(leadAdjustmentSec * 1000));
      } catch (err) {
        console.error('Failed to save lead adjustment:', err);
      }
    }, 1000); // Save 1 second after user stops adjusting

    return () => {
      if (leadSaveDebounceRef.current) {
        clearTimeout(leadSaveDebounceRef.current);
      }
    };
  }, [leadAdjustmentSec, isAdmin, id]);

  // Debounced save of YouTube URL to Firestore
  useEffect(() => {
    if (!isAdmin) return;

    if (youtubeSaveDebounceRef.current) {
      clearTimeout(youtubeSaveDebounceRef.current);
    }

    youtubeSaveDebounceRef.current = setTimeout(async () => {
      try {
        await songService.updateYoutubeUrl(id, youtubeUrl.trim() || null);
      } catch (err) {
        console.error('Failed to save YouTube URL:', err);
      }
    }, 1000);

    return () => {
      if (youtubeSaveDebounceRef.current) {
        clearTimeout(youtubeSaveDebounceRef.current);
      }
    };
  }, [youtubeUrl, isAdmin, id]);

  usePageScroll({
    activeLineIndex: lastActiveLine,
    lyricsContainerId: 'synced-lyrics-container',
    viewportOffset: {
      mobile: 65,
      desktop: 65,
    },
    disabled: disableAutoScroll || isPresentationMode || !isTrackActive,
    onUserScroll: isPresentationMode ? undefined : handleUserScroll,
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

  if (isPresentationMode) {
    return (
      <>
        <Toast message={toast?.message || null} />
        <PresentationModeView
          scrollContainerId="content-scroll-container"
          syncConfig={syncConfig}
          displayHtml={displayHtml}
          hasSynced={hasSynced}
          currentPositionMs={currentPositionMs ?? 0}
          isPlaying={isPlaying}
          showRhymes={showRhymes}
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          leadAdjustmentSec={leadAdjustmentSec}
          onLeadAdjustmentChange={setLeadAdjustmentSec}
          isTrackActive={isTrackActive}
          onExit={() => setIsPresentationMode(false)}
          onLineClick={handleSeekToLine}
        />
      </>
    );
  }

  return (
    <div className="w-full mx-auto p-1 md:p-6 space-y-1 md:space-y-8 relative">
      <Toast message={toast?.message || null} />
      
      <div
        className={`bg-black rounded-tl-xl rounded-tr-xl shadow-lg mb-0 transition-all duration-200 ${
          isHeaderCompact ? 'p-0.5 md:p-6' : 'p-2 md:p-6'
        }`}
      >
        <SongHeader 
          track={track} 
          isPlaying={isPlaying} 
          togglePlayback={togglePlayback}
          rhymeColorMappingComplete={rhymeColorMappingComplete}
          showPlaybackControl={hasSpotifyToken}
        />
      </div>

      <div
        className={`sticky top-0 z-20 bg-black shadow-lg mb-2 transition-all duration-200 ${
          isHeaderCompact ? 'p-0.5 md:p-2' : 'p-1 md:p-2'
        }`}
      >
        <div className="flex justify-around items-center">
          {!editMode && !syncMode && (
            <ActionButtons
              hasSynced={hasSynced}
              hasWordSynced={hasWordSynced}
              wordSyncEnabled={wordSyncEnabled}
              hasRhymeColors={hasRhymeColors}
              showRhymes={showRhymes}
              rhymeColorMappingComplete={rhymeColorMappingComplete}
              hasLyrics={!!displayLyrics}
              lyricsLoading={lyricsLoading}
              isPlaying={isPlaying}
              isAdmin={isAdmin}
              showWordSyncToggle={canShowWordSyncToggle}
              onToggleWordSync={handleToggleWordSync}
              onToggleRhymes={handleToggleRhymes}
              onToggleRhymeComplete={handleToggleRhymeComplete}
              onEditSync={() => setSyncMode(true)}
              onEditLyrics={() => setEditMode(true)}
              onAdminControlsHiddenChange={setAdminControlsHidden}
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
          <div className="relative pt-0">
            {!adminControlsHidden && isAuthenticated && (
              <div className="sticky top-10 right-3 z-20 flex justify-end">
                <button
                  type="button"
                  aria-label="Enter presentation mode"
                  onClick={togglePresentationMode}
                  className="rounded-full border border-white/10 bg-black/60 p-2 text-white shadow-lg transition hover:bg-black/70 cursor-pointer"
                >
                  <FaExpand />
                </button>
              </div>
            )}
            <SyncedLyrics
              syncedLyrics={syncConfig.lyrics}
              currentPositionMs={currentPositionMs ?? 0}
              isPlaying={isPlaying}
              rhymeEncodedLines={syncConfig.rhymeEncodedLines}
              showRhymes={showRhymes}
              mode={syncConfig.mode}
              onActiveLineChange={setLastActiveLine}
              onLineClick={handleSeekToLine}
              containerId="synced-lyrics-container"
              isAuthenticated={isAuthenticated}
              isAdmin={isAdmin}
              leadAdjustmentSec={leadAdjustmentSec}
              onLeadAdjustmentChange={setLeadAdjustmentSec}
              youtubeUrl={youtubeUrl}
              onYoutubeUrlChange={setYoutubeUrl}
              showLeadAdjustment={true}
              isTrackActive={isTrackActive}
            />
          </div>
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

        {hasSynced && !syncMode && !editMode && isAdmin && !adminControlsHidden && (
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
