# Decoded Next

A modern Next.js application built with React, TypeScript, and Tailwind CSS, integrating the Spotify API to fetch and display music data.

## Features
- **Spotify Integration**: Authenticate users and fetch playlists, tracks, and artist data.
- **Responsive UI**: Tailwind-powered components for seamless mobile/desktop experience.
- **Type Safety**: Full TypeScript support for robust development.
- **Server-Side Rendering**: Leverage Next.js for fast, SEO-friendly pages.

## Tech Stack
- Next.js 14+
- React 18
- TypeScript 5+
- Tailwind CSS
- Spotify Web API

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- A Spotify Developer account: [Create one here](https://developer.spotify.com/dashboard/) and note your Client ID and Client Secret.
- A Google Firebase Account: [Create one here](https://console.firebase.google.com/) and add configuration variables to env file.

### Installation
1. Clone the repository:
2. Install dependencies:
3. Set up environment variables: Create a `.env.local` file in the root and add:

```bash
SPOTIFY_CLIENT_ID=""
SPOTIFY_CLIENT_SECRET=""
SPOTIFY_REDIRECT_URI=""

NEXT_PUBLIC_SPOTIFY_CLIENT_ID=
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=
NEXT_PUBLIC_BASE_URL=

FIREBASE_API_KEY=""
FIREBASE_AUTH_DOMAIN=""
FIREBASE_DB_URL=""
FIREBASE_PROJECT_ID=""
FIREBASE_STORAGE_BUCKET=""
FIREBASE_MESSAGING_SENDER_ID=""
FIREBASE_APP_ID=""
FIREBASE_MEASUREMENT_ID=""
```
4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Available Scripts
- `npm run dev`: Starts the development server.
- `npm run build`: Builds the app for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint for code quality.