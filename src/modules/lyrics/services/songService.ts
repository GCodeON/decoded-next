import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { SavedSong } from '@/modules/lyrics';

export class SongService {
  private readonly collection = 'songs';

  async getSong(trackId: string): Promise<any | null> {
    const ref = doc(db, this.collection, trackId);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  async saveSong(trackId: string, song: SavedSong): Promise<void> {
    await setDoc(doc(db, this.collection, trackId), song);
  }

  async updateLyrics(trackId: string, plain: string, rhymeEncoded: string): Promise<void> {
    await updateDoc(doc(db, this.collection, trackId), {
      'lyrics.plain': plain,
      'lyrics.rhymeEncoded': rhymeEncoded,
    });
  }

  async updateSyncedLyrics(trackId: string, synced: string | null): Promise<void> {
    await updateDoc(doc(db, this.collection, trackId), {
      'lyrics.synced': synced,
    });
  }

  async updatePublishMetadata(trackId: string, signature: string, timestamp: number): Promise<void> {
    await updateDoc(doc(db, this.collection, trackId), {
      'lrclib.published': true,
      'lrclib.signature': signature,
      'lrclib.lastPublishedAt': timestamp,
    });
  }
}

export const songService = new SongService();
