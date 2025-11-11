/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    SPOTIFY_CLIENT_ID           : process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET       : process.env.SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REDIRECT_URI        : process.env.SPOTIFY_REDIRECT_URI,
    GENIUS_CLIENT_ID            : process.env.GENIUS_CLIENT_ID,
    GENIUS_CLIENT_SECRET        : process.env.GENIUS_CLIENT_SECRET,
    GENIUS_CLIENT_ACCESS_TOKEN  : process.env.GENIUS_CLIENT_ACCESS_TOKEN,
    FIREBASE_API_KEY            : process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN        : process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_DB_URL             : process.env.FIREBASE_DB_URL,
    FIREBASE_PROJECT_ID         : process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET     : process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID             : process.env.FIREBASE_APP_ID,
    FIREBASE_MEASUREMENT_ID     : process.env.FIREBASE_MEASUREMENT_ID
  },
  images: {
    domains: ["i.scdn.co"]
  }
}

module.exports = nextConfig
