import React from 'react';

interface PlaylistItem {
  id: number; 
  name: string 
  external_urls: { 
    spotify: string; 
  };
}

interface Playlists {
  items: [];
}

const FeaturedPlaylists = ( playlists: Playlists ) => {
  return (
    <div>
      <h2>Featured Playlists</h2>
      <ul>
        {playlists.items.map((playlist: PlaylistItem) => (
          <li key={playlist.id}>
            <a href={playlist.external_urls.spotify} target="_blank" rel="noopener noreferrer">
              {playlist.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FeaturedPlaylists;
