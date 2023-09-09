/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        SPOTIFY_CLIENT_ID    : "0b9ef3c3ea8c44959cf5b6a9b5fe71d9",
        SPOTIFY_CLIENT_SECRET: "3e1020b4edfb436086a4776546b71e62",
        SPOTIFY_REDIRECT_URI : "http://localhost:3000/callback/"
      },
}

module.exports = nextConfig
