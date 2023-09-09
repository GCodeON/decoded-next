'use client'
import { useState, useEffect } from 'react';
import { FaUser, FaPowerOff } from "react-icons/fa";

import { useAuth } from '@/hooks/spotify';

export default function Auth() {
    const [auth, setAuth] = useState(false);

    useEffect(() => {
        if (localStorage.getItem('auth')) {
            setAuth(true)
        } 
    },[])

    const { login } = useAuth();

    const onLogout = () => {
        localStorage.clear();
        window.location.href = "/";
    }

    const Spotify_User = () => {
        let icon = <p>loading...</p>
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