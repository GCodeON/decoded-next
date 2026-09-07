/**
 * Export Transcribed & Rhyme-Encoded Songs from Firestore for AI Fine-Tuning
 *
 * This script exports ground-truth transcribed songs into instruction JSONL format
 * ready for fine-tuning open-source models (Unsloth on Google Colab / Kaggle,
 * Azure OpenAI, or AWS Bedrock).
 *
 * Usage:
 *   node scripts/export-training-dataset.mjs
 *   node scripts/export-training-dataset.mjs --completedOnly=true --output=dataset.jsonl
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Load .env.local
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
} catch {
  console.log('⚠️  No .env.local found — relying on environment variables');
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SYSTEM_PROMPT = `You are an expert phonetic rhyme encoder for music lyrics.
Given the artist and plain lyrics, output a JSON object with key "lines" where each line contains the lyrics with rhyming vowel sounds wrapped in <span style="background-color:HEX;color:#fff" data-vowel="IPA"> tags based on the musical delivery of the artist.`;

async function exportDataset() {
  console.log('🚀 Fetching transcribed songs from Firestore...');
  const songsRef = collection(db, 'songs');
  const snapshot = await getDocs(songsRef);

  const trainingExamples = [];
  let totalSongsProcessed = 0;

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const artist = data.artist || 'Unknown Artist';
    const title = data.title || 'Unknown Track';
    const lyrics = data.lyrics;

    if (!lyrics) return;

    const plain = lyrics.plain?.trim();
    const rhymeEncodedLines = lyrics.rhymeEncodedLines || [];
    const rhymeEncoded = lyrics.rhymeEncoded?.trim();

    // Check if we have valid ground-truth rhyme encoding
    const hasEncoding = (rhymeEncodedLines.length > 0 && rhymeEncodedLines.some(l => l.includes('<span'))) ||
      (rhymeEncoded && rhymeEncoded.includes('<span'));

    if (!plain || !hasEncoding) return;

    const lines = rhymeEncodedLines.length > 0
      ? rhymeEncodedLines
      : rhymeEncoded.split('\n').map(l => l.trim()).filter(Boolean);

    // Split song into 4-to-8 bar chunks to keep optimal context window
    const plainLines = plain.split('\n').map(l => l.trim()).filter(Boolean);
    const CHUNK_SIZE = 6;

    for (let i = 0; i < plainLines.length; i += CHUNK_SIZE) {
      const chunkPlain = plainLines.slice(i, i + CHUNK_SIZE).join('\n');
      const chunkEncoded = lines.slice(i, i + CHUNK_SIZE);

      if (chunkPlain && chunkEncoded.length > 0) {
        trainingExamples.push({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Artist: ${artist}\nSong: ${title}\nLyrics:\n${chunkPlain}`,
            },
            {
              role: 'assistant',
              content: JSON.stringify({ lines: chunkEncoded }),
            },
          ],
        });
      }
    }

    totalSongsProcessed++;
  });

  console.log(`✅ Processed ${totalSongsProcessed} songs. Generated ${trainingExamples.length} training chunks.`);

  const outputPath = resolve(__dirname, '../training_dataset.jsonl');
  const jsonlContent = trainingExamples.map((ex) => JSON.stringify(ex)).join('\n');
  writeFileSync(outputPath, jsonlContent, 'utf-8');

  console.log(`💾 Saved training dataset to: ${outputPath}`);
}

exportDataset().catch((err) => {
  console.error('❌ Export failed:', err);
  process.exit(1);
});
