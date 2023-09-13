'use client'
import { useState, useEffect } from 'react';
import SpotifyPlayer from 'react-spotify-web-playback';

export default function Player() {
    const [spotifyToken, setSpotifyToken] = useState('')
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
        console.log('compare track')
        if(updated.name !== old.name) {
            console.log('different');
            setActiveTrack(updated);
            setSongChange(true);
        } else {
            console.log('same');
            setSongChange(false);
        }
    }

    const spotifyCallback = (state: any) => {
        // console.log('state', state);
        if(state.status == "READY") {
            // if(state.track){
            //     localStorage.setItem('active', JSON.stringify(state.track));
            // }
            if(state.type == "track_update") {
                let previousTrack = localStorage.getItem('active');
                if(previousTrack){
                    compareTrack(JSON.parse(previousTrack), state.track);
                }
            }
        }
    }

    return (
        <div className="spotify_player sticky top-[100vh]">
            {spotifyToken && (
                <SpotifyPlayer
                    name={'DECODED Web Player'}
                    callback={(state) => spotifyCallback(state)}
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
            )}
        </div>
    )
}