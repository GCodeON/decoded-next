'use client'
import { useState, useEffect } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';

export default function Player() {
    const [spotifyToken, setSpotifyToken] = useState('');
    const [ playerState, setPlayerState] = useState(true);
    const [ activeTrack, setActiveTrack] = useState({});
    const [ songChanged, setSongChange] = useState(false);

    useEffect(() => {
        console.log('get props', localStorage.getItem('auth'));

      },[]);

    return (
        <div className="sticky top-[100vh]">
          <SpotifyPlayer
            name={'DECODED Web Player'}
            syncExternalDeviceInterval={10}
            persistDeviceSelection={true}
            syncExternalDevice={true}
            token={spotifyToken}
            styles={{
              activeColor       : '#fff',
              bgColor           : '#000',
              color             : '#fff',
              loaderColor       : '#fff',
              trackArtistColor  : '#ccc',
              trackNameColor    : '#fff',
              sliderHandleColor : '#fff'

            }}
          />
        </div>
    )
}