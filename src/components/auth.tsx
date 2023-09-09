'use client'
import React, { useState, useEffect } from 'react';
import { FaUser, FaPowerOff } from "react-icons/fa";
import { useAuth } from '@/hooks/spotify';
import useLocalStorage from '@/hooks/useLocalStorage';

const Auth = () => {
    const [value, setValue] = useLocalStorage("spotify_token", "");

    // Set the value received from the local storage to a local state
    const [auth, setAuth] = useState(value);

    const onLogout = () => {
        localStorage.clear();
        window.location.href = "/";
    }
  const { login } = useAuth();

    const Spotify_User = () => {
        let icon;
        if (auth) { 
            icon =
            <div className='logout' onClick={onLogout}>
                <FaUser className="icon"/>
            </div>
        } else {
            icon =
            <div className='login' onClick={login}>
                <FaPowerOff className="icon"/>
            </div>
        }
        return icon;
    }

    return (
        <div className="settings">
            { Spotify_User() }
        </div>
    )

}

export default Auth;