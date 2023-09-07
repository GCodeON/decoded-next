import { useEffect } from 'react';
import axios from 'axios';

const Dashboard = ({ accessToken }: { accessToken: string }) => {
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        // Handle the Spotify API response
        console.log(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchPlaylists();
  }, [accessToken]);

  return (
    <div>
      {/* Your Dashboard Content */}
    </div>
  );
};

export default Dashboard;
