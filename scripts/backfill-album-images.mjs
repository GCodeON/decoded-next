/**
 * One-time backfill: reads songs in Firestore that are missing
 * `albumImageUrl`, fetches metadata from the Spotify tracks API using
 * Client Credentials, then writes it back. Missing or placeholder titles and
 * artists are repaired automatically; --repairTitle=true and --repairArtist=true
 * replace every saved value of the respective metadata field.
 *
 * Usage:
 *   node scripts/backfill-album-images.mjs
 
 *   node scripts/backfill-album-images.mjs --offset=50 --limit=25 --delay=500
 *   node scripts/backfill-album-images.mjs --repairTitle=true --limit=25
 *   node scripts/backfill-album-images.mjs --repairArtist=true --limit=25
 *
 * Requires .env.local to be present (or the variables to be in the environment).
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Load .env.local manually (no dotenv dependency needed)
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');

try {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
  console.log('✅ Loaded .env.local');
} catch {
  console.log('⚠️  No .env.local found — relying on environment variables');
}

// ---------------------------------------------------------------------------
// Imports (after env is loaded)
// ---------------------------------------------------------------------------
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import axios from 'axios';

const MAX_RETRIES = 5;
const REQUEST_DELAY_MS = 250;
const ONLY_COMPLETE_DEFAULT = true;
const USE_PROGRESS_DEFAULT = true;
const PROGRESS_FILE_DEFAULT = resolve(__dirname, 'backfill-album-images.progress.json');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseNumberArg(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw.slice(prefix.length), 10);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
}

function parseBooleanArg(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return fallback;
  const value = raw.slice(prefix.length).toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function parseStringArg(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  if (!raw) return fallback;
  const value = raw.slice(prefix.length).trim();
  return value || fallback;
}

function hasArg(name) {
  const prefix = `--${name}=`;
  return process.argv.some((arg) => arg.startsWith(prefix));
}

function readProgress(progressFile) {
  if (!existsSync(progressFile)) return null;

  try {
    const raw = readFileSync(progressFile, 'utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed?.nextOffset !== 'number' || parsed.nextOffset < 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeProgress(progressFile, payload) {
  writeFileSync(progressFile, JSON.stringify(payload, null, 2));
}

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey:            process.env.FIREBASE_API_KEY,
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL:       process.env.FIREBASE_DB_URL,
  projectId:         process.env.FIREBASE_PROJECT_ID,
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ---------------------------------------------------------------------------
// Spotify Client Credentials token
// ---------------------------------------------------------------------------
async function getSpotifyToken() {
  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    { headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data.access_token;
}

function normalizeTrackId(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return null;

  // spotify:track:<id>
  const uriMatch = rawValue.match(/^spotify:track:([A-Za-z0-9]+)$/);
  if (uriMatch) return uriMatch[1];

  // https://open.spotify.com/track/<id>
  const urlMatch = rawValue.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  // Already a plain track id
  return rawValue;
}

function needsTitleBackfill(title) {
  return !title || title.trim().toLowerCase() === 'untitled';
}

function needsArtistBackfill(artist, artists) {
  const hasPlaceholderArtist = !artist || artist.trim().toLowerCase() === 'unknown artist';
  const hasArtistList = Array.isArray(artists) && artists.some((item) => item?.name?.trim());
  return hasPlaceholderArtist || !hasArtistList;
}

// ---------------------------------------------------------------------------
// Fetch track metadata for one track id, with retries on 429.
// ---------------------------------------------------------------------------
async function fetchTrackMetadata(trackId, token, attempt = 1) {
  try {
    const res = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      albumImageUrl: res.data?.album?.images?.[0]?.url ?? null,
      title: res.data?.name?.trim() || null,
      artist: res.data?.artists?.[0]?.name?.trim() || null,
      artists: Array.isArray(res.data?.artists)
        ? res.data.artists
          .filter((artist) => artist?.name?.trim() && artist?.id)
          .map((artist) => ({ name: artist.name.trim(), id: artist.id }))
        : [],
    };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 429 && attempt <= MAX_RETRIES) {
      const retryAfterHeader = err?.response?.headers?.['retry-after'];
      const retryAfterSeconds = Number.parseInt(retryAfterHeader || '2', 10);
      const backoffMs = Number.isNaN(retryAfterSeconds)
        ? attempt * 2000
        : retryAfterSeconds * 1000;

      console.log(`⏳ Spotify rate-limited. Retrying in ${Math.ceil(backoffMs / 1000)}s (attempt ${attempt}/${MAX_RETRIES})...`);
      await sleep(backoffMs);
      return fetchTrackMetadata(trackId, token, attempt + 1);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const limit = parseNumberArg('limit', 0);
  const offsetFromArg = parseNumberArg('offset', 0);
  const hasOffsetArg = hasArg('offset');
  const delayMs = parseNumberArg('delay', REQUEST_DELAY_MS);
  const onlyComplete = parseBooleanArg('onlyComplete', ONLY_COMPLETE_DEFAULT);
  const repairTitle = parseBooleanArg('repairTitle', false);
  const repairArtist = parseBooleanArg('repairArtist', false);
  const useProgress = parseBooleanArg('useProgress', USE_PROGRESS_DEFAULT);
  const resetProgress = parseBooleanArg('resetProgress', false);
  const progressFile = parseStringArg('progressFile', PROGRESS_FILE_DEFAULT);

  if (resetProgress && existsSync(progressFile)) {
    unlinkSync(progressFile);
    console.log(`♻️  Progress reset: ${progressFile}`);
  }

  const previousProgress = useProgress ? readProgress(progressFile) : null;
  let offset = hasOffsetArg
    ? offsetFromArg
    : previousProgress?.nextOffset ?? 0;

  const songsRef = collection(db, 'songs');
  const songsQuery = onlyComplete
    ? query(songsRef, where('lyrics.rhymeColorMappingComplete', '==', true))
    : songsRef;

  console.log(onlyComplete
    ? '🔍 Fetching encoded-complete songs from Firestore…'
    : '🔍 Fetching all songs from Firestore…');
  const snap = await getDocs(songsQuery);
  const allSongs = snap.docs
    .map((d) => ({ _docId: d.id, ...d.data() }))
    .sort((a, b) => a._docId.localeCompare(b._docId));

  const missingAll = allSongs.filter((s) => !s.albumImageUrl);
  const titlesNeedingBackfill = allSongs.filter((s) => needsTitleBackfill(s.title));
  const artistsNeedingBackfill = allSongs.filter((s) => needsArtistBackfill(s.artist, s.artists));
  const requiresBackfill = (song) => (
    !song.albumImageUrl
    || needsTitleBackfill(song.title)
    || needsArtistBackfill(song.artist, song.artists)
    || repairTitle
    || repairArtist
  );
  const hasOutstandingWork = missingAll.length > 0
    || titlesNeedingBackfill.length > 0
    || artistsNeedingBackfill.length > 0
    || repairTitle
    || repairArtist;
  const hasOutstandingWorkAfterOffset = allSongs
    .slice(offset)
    .some(requiresBackfill);

  if (!hasOffsetArg && hasOutstandingWork && !hasOutstandingWorkAfterOffset) {
    console.log('♻️  Saved progress passed outstanding work; rescanning from the start of the current scope.');
    offset = 0;
  }

  const selected = [];
  let nextOffset = allSongs.length;

  for (let index = offset; index < allSongs.length; index++) {
    const song = allSongs[index];

    if (requiresBackfill(song)) {
      selected.push({
        docId: song._docId,
        trackId: normalizeTrackId(song.spotify || song._docId),
        title: song.title,
        artist: song.artist,
        artists: song.artists,
      });

      if (limit > 0 && selected.length >= limit) {
        nextOffset = index + 1;
        break;
      }
    }
  }

  console.log(`📋 ${allSongs.length} songs in scope, ${missingAll.length} missing albumImageUrl`);
  console.log(`📝 ${titlesNeedingBackfill.length} songs need a title backfill`);
  console.log(`🎤 ${artistsNeedingBackfill.length} songs need an artist backfill`);
  console.log(`🎯 Scope filter: onlyComplete=${onlyComplete}, repairTitle=${repairTitle}, repairArtist=${repairArtist}`);
  console.log(`⚙️  Running range: offset=${offset}, limit=${limit || 'all'}, selected=${selected.length}, delay=${delayMs}ms`);
  console.log(`🧠 Progress: useProgress=${useProgress}, file=${progressFile}`);

  if (selected.length === 0) {
    if (useProgress) {
      writeProgress(progressFile, {
        updatedAt: new Date().toISOString(),
        nextOffset,
        scopeTotal: allSongs.length,
        scopeMissing: missingAll.length,
        lastRun: { selected: 0, updated: 0, failed: 0 },
      });
    }
    console.log('✅ Nothing to backfill.');
    process.exit(0);
  }

  console.log('🎵 Obtaining Spotify token…');
  const token = await getSpotifyToken();

  let updated = 0;
  let failed  = 0;

  for (let i = 0; i < selected.length; i++) {
    const song = selected[i];
    try {
      if (!song.trackId) {
        console.log(`  ⚠️  ${song.docId} — invalid Spotify track id`);
        failed++;
        continue;
      }

      if ((i + 1) % 20 === 0 || i === 0) {
        console.log(`🎵 Processing song ${i + 1}/${selected.length}...`);
      }

      const metadata = await fetchTrackMetadata(song.trackId, token);
      const updates = {};

      if (metadata.albumImageUrl) {
        updates.albumImageUrl = metadata.albumImageUrl;
      }

      if ((needsTitleBackfill(song.title) || repairTitle) && metadata.title) {
        updates.title = metadata.title;
      }

      if ((needsArtistBackfill(song.artist, song.artists) || repairArtist) && metadata.artist) {
        updates.artist = metadata.artist;
        updates.artists = metadata.artists;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'songs', song.docId), updates);
        updated++;
      } else {
        console.log(`  ⚠️  ${song.docId} — no album image, title, or artist returned by Spotify`);
      }
    } catch (err) {
      console.error(`  ❌ ${song.docId} — ${err.message}`);
      failed++;
    }

    await sleep(delayMs);
  }

  if (useProgress) {
    writeProgress(progressFile, {
      updatedAt: new Date().toISOString(),
      nextOffset,
      scopeTotal: allSongs.length,
      scopeMissing: missingAll.length,
      lastRun: {
        selected: selected.length,
        updated,
        failed,
        onlyComplete,
        limit,
        delayMs,
      },
    });
    console.log(`💾 Progress saved: nextOffset=${nextOffset}`);
  }

  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
