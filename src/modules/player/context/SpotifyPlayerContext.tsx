 'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';

type SpotifyPlayerContextType = {
  deviceId: string | null;
  setDeviceId: (id: string | null) => void;
  lastExternalDevice: string | null;
  setLastExternalDevice: (id: string | null) => void;
  webLastPosition: number | null;
  setWebLastPosition: (s: number | null) => void;
  webLastTrack: string | null;
  setWebLastTrack: (id: string | null) => void;
  webIsPlaying: boolean;
  setWebIsPlaying: (v: boolean) => void;
  globalTrackId: string | null;
  setGlobalTrackId: (id: string | null) => void;
  globalPosition: number | null;
  setGlobalPosition: (s: number | null) => void;
  globalIsPlaying: boolean;
  setGlobalIsPlaying: (v: boolean) => void;
};

const ctxDefault: SpotifyPlayerContextType = {
  deviceId: null,
  setDeviceId: () => {},
  lastExternalDevice: null,
  setLastExternalDevice: () => {},
  webLastPosition: null,
  setWebLastPosition: () => {},
  webLastTrack: null,
  setWebLastTrack: () => {},
  webIsPlaying: false,
  setWebIsPlaying: () => {},
  globalTrackId: null,
  setGlobalTrackId: () => {},
  globalPosition: null,
  setGlobalPosition: () => {},
  globalIsPlaying: false,
  setGlobalIsPlaying: () => {},
};

const SpotifyPlayerContext = createContext<SpotifyPlayerContextType>(ctxDefault);

export const useSpotifyPlayer = () => useContext(SpotifyPlayerContext);

export const SpotifyPlayerProvider = ({ children }: { children: React.ReactNode }) => {
  // Use sessionStorage for per-tab persistence across reloads (avoids cross-tab conflicts)
  const [deviceId, setDeviceIdState] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('spotify_device_id');
    } catch (e) {
      return null;
    }
  });

  const [lastExternalDevice, setLastExternalDeviceState] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('spotify_last_external_device');
    } catch (e) {
      return null;
    }
  });

  const [webLastPosition, setWebLastPositionState] = useState<number | null>(() => {
    try {
      const v = sessionStorage.getItem('spotify_web_last_position');
      return v ? Number(v) : null;
    } catch (e) {
      return null;
    }
  });

  const [webLastTrack, setWebLastTrackState] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('spotify_web_last_track');
    } catch (e) {
      return null;
    }
  });

  const [webIsPlaying, setWebIsPlayingState] = useState<boolean>(() => {
    try {
      const v = sessionStorage.getItem('spotify_web_is_playing');
      return v === '1';
    } catch {
      return false;
    }
  });


  // Keep sessionStorage in sync when states change
  useEffect(() => {
    try {
      if (deviceId) sessionStorage.setItem('spotify_device_id', deviceId);
      else sessionStorage.removeItem('spotify_device_id');
    } catch (e) {}
  }, [deviceId]);

  useEffect(() => {
    try {
      if (lastExternalDevice) sessionStorage.setItem('spotify_last_external_device', lastExternalDevice);
      else sessionStorage.removeItem('spotify_last_external_device');
    } catch (e) {}
  }, [lastExternalDevice]);

  useEffect(() => {
    try {
      if (webLastPosition !== null) sessionStorage.setItem('spotify_web_last_position', String(Math.floor(webLastPosition)));
      else sessionStorage.removeItem('spotify_web_last_position');
    } catch (e) {}
  }, [webLastPosition]);

  useEffect(() => {
    try {
      if (webLastTrack) sessionStorage.setItem('spotify_web_last_track', webLastTrack);
      else sessionStorage.removeItem('spotify_web_last_track');
    } catch (e) {}
  }, [webLastTrack]);

  useEffect(() => {
    try {
      sessionStorage.setItem('spotify_web_is_playing', webIsPlaying ? '1' : '0');
    } catch {}
  }, [webIsPlaying]);

  // Global playback (any active device) - not persisted across reloads intentionally
  const [globalTrackId, setGlobalTrackId] = useState<string | null>(null);
  const [globalPosition, setGlobalPosition] = useState<number | null>(null);
  const [globalIsPlaying, setGlobalIsPlaying] = useState<boolean>(false);

  const setDeviceId = (id: string | null) => setDeviceIdState(id);
  const setLastExternalDevice = (id: string | null) => setLastExternalDeviceState(id);
  const setWebLastPosition = (s: number | null) => setWebLastPositionState(s);
  const setWebLastTrack = (id: string | null) => setWebLastTrackState(id);
  const setWebIsPlaying = (v: boolean) => setWebIsPlayingState(v);
  const updateGlobalPosition = (s: number | null) => setGlobalPosition(s);
  const updateGlobalTrackId = (id: string | null) => setGlobalTrackId(id);
  const updateGlobalIsPlaying = (v: boolean) => setGlobalIsPlaying(v);

  return (
    <SpotifyPlayerContext.Provider
      value={{ 
        deviceId, 
        setDeviceId, 
        lastExternalDevice, 
        setLastExternalDevice, 
        webLastPosition, 
        setWebLastPosition, 
        webLastTrack, 
        setWebLastTrack,
        webIsPlaying,
        setWebIsPlaying,
        globalTrackId,
        setGlobalTrackId: updateGlobalTrackId,
        globalPosition,
        setGlobalPosition: updateGlobalPosition,
        globalIsPlaying,
        setGlobalIsPlaying: updateGlobalIsPlaying,
      }}
    >
      {children}
    </SpotifyPlayerContext.Provider>
  );
};

export default SpotifyPlayerContext;
