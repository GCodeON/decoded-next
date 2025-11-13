'use client'
import { useState, useEffect } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';

export default function Player() {
    const [spotifyToken, setSpotifyToken] = useState('');
    const [ activeTrack, setActiveTrack] = useState({});
    const [ songChanged, setSongChange] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            setSpotifyToken(token);
        } 
    },[]);

    useEffect(() => {
        if(songChanged) {
            localStorage.setItem('active', JSON.stringify(activeTrack));
        }
    },[songChanged]);

    function compareTrack(old: any, updated: any) {
        console.log('compare track', updated.name, old.name);
        if(updated.name == old.name) {
            setSongChange(false);
        } else {
            console.log('different', updated.name, old.name);
            setActiveTrack(updated);
            setSongChange(true);
        }
    }

    const spotifyCallback = (state: any) => {
        let previousTrack = localStorage.getItem('active');
        console.log('spotify callback', state);
        if(state.status == "READY") {
            if(state.type == "track_update") {
                if(previousTrack){
                    compareTrack(JSON.parse(previousTrack), state.track);
                }
            }
        }
    }

    return (
        <>
            {spotifyToken && (
                <SpotifyPlayer
                    name={'DECODED Web Player'}
                    callback={(state) => spotifyCallback(state)}
                    syncExternalDeviceInterval={2}
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
            )}
        </>
    )
}