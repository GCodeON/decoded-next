import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
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

  async updateLyrics(
    trackId: string,
    plain: string,
    rhymeEncoded: string,
    synced?: string | null,
    wordSynced?: string | null
  ): Promise<void> {
    const updates: Record<string, any> = {
      'lyrics.plain': plain,
      'lyrics.rhymeEncoded': rhymeEncoded,
    };

    if (synced !== undefined) {
      updates['lyrics.synced'] = synced;
    }
    if (wordSynced !== undefined) {
      updates['lyrics.wordSynced'] = wordSynced;
    }

    await updateDoc(doc(db, this.collection, trackId), updates);
  }

  async updateSyncedLyrics(trackId: string, synced: string | null): Promise<void> {
    await updateDoc(doc(db, this.collection, trackId), {
      'lyrics.synced': synced,
    });
  }

  async updateWordSyncedLyrics(trackId: string, wordSynced: string | null): Promise<void> {
    await updateDoc(doc(db, this.collection, trackId), {
      'lyrics.wordSynced': wordSynced,
    });
  }

  async updateRhymeColorMappingComplete(trackId: string, complete: boolean): Promise<void> {
    await updateDoc(doc(db, this.collection, trackId), {
      'lyrics.rhymeColorMappingComplete': complete,
    });
  }

  async updateLeadAdjustment(trackId: string, leadAdjustmentMs: number): Promise<void> {
    await updateDoc(doc(db, this.collection, trackId), {
      leadAdjustmentMs,
    });
  }

  async updateYoutubeUrl(trackId: string, youtubeUrl: string | null): Promise<void> {
    await updateDoc(doc(db, this.collection, trackId), {
      youtubeUrl: youtubeUrl || null,
    });
  }

  async updateAlbumImageUrl(trackId: string, albumImageUrl: string | null): Promise<void> {
    await updateDoc(doc(db, this.collection, trackId), {
      albumImageUrl: albumImageUrl || null,
    });
  }

  async updatePublishMetadata(trackId: string, signature: string, timestamp: number): Promise<void> {
    await updateDoc(doc(db, this.collection, trackId), {
      'lrclib.published': true,
      'lrclib.signature': signature,
      'lrclib.lastPublishedAt': timestamp,
    });
  }

  async getSongsWithRhymeComplete(limitCount?: number): Promise<Array<SavedSong & { id: string }>> {
    const songsRef = collection(db, this.collection);
    let q = query(songsRef, where('lyrics.rhymeColorMappingComplete', '==', true));
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    
    const songs: Array<SavedSong & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      songs.push({ id: doc.id, ...doc.data() } as SavedSong & { id: string });
    });
    
    return songs;
  }
}

export const songService = new SongService();
