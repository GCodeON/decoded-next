# Decoded Next

A modern Next.js application for analyzing and visualizing song lyrics, built with React, TypeScript, and Tailwind CSS. Integrates Spotify API for music playback and lyrics analysis with advanced NLP techniques.

## Features
- **Lyrics Analysis**: Deep analysis of rhyme schemes, flow patterns, vocabulary, and literary devices
- **Song Comparison**: Compare multiple songs across various lyrical metrics
- **Interactive Visualization**: Visual representations of rhyme patterns, flow, and more
- **Spotify Integration**: Authenticate users, fetch tracks, and control playback
- **Synced Lyrics**: Display and edit time-synced lyrics with real-time playback

## Tech Stack
- Next.js 16.0.4
- React 19.2.0
- TypeScript 5.9+
- Tailwind CSS 4.1+ with @tailwindcss/postcss
- Spotify Web API
- Firebase
- SunEditor for rich text editing

## Project Architecture

The project follows a modular architecture with clear separation of concerns:


### `/modules` - Foundational Building Blocks
Core application modules that provide data and functionality:
- `auth/` - User authentication and authorization
- `lyrics/` - Lyrics fetching, syncing, and editing
- `player/` - Spotify playback integration and controls
- `spotify/` - Spotify API client and data fetching

### `/features` - User-Facing Capabilities
High-level features built on top of modules:
- `analysis/` - Lyrics analysis (rhyme, flow, vocabulary, literary devices)
- `comparison/` - Compare songs and artists across metrics
- `visualization/` - Visual representations of analysis results

### `/core` - Pure Domain Logic
Framework-agnostic business logic:
- `analyzers/` - Analysis algorithms (flow, rhyme, vocabulary, literary)
- `entities/` - Domain models and types
- `processors/` - Data transformation and processing


## Code Organization

Each module and feature follows a consistent internal structure:

```
module-name/
  ├── components/     # React components specific to this module
  ├── hooks/          # Custom React hooks for component logic
  ├── services/       # Business logic and API interactions
  ├── types/          # TypeScript type definitions
  ├── utils/          # Helper functions and utilities
  ├── context/        # React Context providers (if needed)
  ├── config/         # Configuration files (if needed)
  └── index.ts        # Public API exports
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- A Spotify Developer account: [Create one here](https://developer.spotify.com/dashboard/) and note your Client ID and Client Secret.
- A Google Firebase Account: [Create one here](https://console.firebase.google.com/) and add configuration variables to env file.

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

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


## Development Guidelines

### Adding New Features
1. **Modules**: Add foundational functionality to `/modules` (e.g., new data sources)
2. **Features**: Build user-facing capabilities in `/features` using existing modules
3. **Core**: Add pure domain logic to `/core/analyzers` or `/core/processors`
4. **Services**: External integrations go in `/lib`
