export interface SavedSong {
  title: string;
  artist: string;
  spotify: string;
  lyrics: {
    plain: string;
    synced: string | null;
    rhymeEncoded: string;
  };
}
export interface SyncedLine {
  time: number;
  text: string;
  element: HTMLDivElement | null;
}