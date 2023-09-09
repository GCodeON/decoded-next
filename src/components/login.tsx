// // components/Auth.tsx
// import { useEffect } from 'react';
// import { useRouter } from 'next/router';
// import { useAuth } from '../hooks/useAuth';

// export const Auth = () => {
//   const router = useRouter();
//   const { login } = useAuth();

//   useEffect(() => {
//     login();
//   }, []);

//   return (
//     <div>
//       Redirecting to Spotify login...
//     </div>
//   );
// };

'use client'
import React, { useState, useEffect } from 'react';
import { FaUser, FaPowerOff } from "react-icons/fa";
import { useAuth } from '@/hooks/useAuth';

const Login = () => {
    

  const onLogout = () => {
      localStorage.clear();
      window.location.href = "/";
  }
  const { login } = useAuth();

    const Spotify_User = () => {
        let icon;
        if (localStorage.getItem('spotify_token')) { 
            icon =
            <div className='logout' onClick={onLogout}>
                {/* <p className=''>Logout</p> */}
                <FaUser className="icon"/>
            </div>
        } else {
            icon =
            <div className='login' onClick={login}>
                {/* <p className=''>Login</p> */}
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

export default Login;