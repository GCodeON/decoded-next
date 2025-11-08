/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    SPOTIFY_CLIENT_ID         : process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET     : process.env.SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REDIRECT_URI      : process.env.SPOTIFY_REDIRECT_URI,
    GENIUS_CLIENT_ID          : process.env.GENIUS_CLIENT_ID,
    GENIUS_CLIENT_SECRET      : process.env.GENIUS_CLIENT_SECRET,
    GENIUS_CLIENT_ACCESS_TOKEN: process.env.GENIUS_CLIENT_ACCESS_TOKEN
  },
  images: {
    domains: ["i.scdn.co"]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only modules from client bundle
      config.externals.push('puppeteer-extra');
      config.externals.push('puppeteer-extra-plugin-adblocker');
      config.externals.push('puppeteer');
      config.externals.push('cheerio');
    }
    return config;
  }

}

module.exports = nextConfig
