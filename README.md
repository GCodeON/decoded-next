# Decoded Next

A modern Next.js application for analyzing and visualizing song lyrics, built with React, TypeScript, and Tailwind CSS. Integrates Spotify API for music playback and lyrics analysis with advanced NLP techniques.

## Features
- **Lyrics Analysis**: Deep analysis of rhyme schemes, flow patterns, vocabulary, and literary devices
- **Song Comparison**: Compare multiple songs across various lyrical metrics
- **Interactive Visualization**: Visual representations of rhyme patterns, flow, and more
- **Spotify Integration**: Authenticate users, fetch tracks, and control playback
- **Synced Lyrics**: Display and edit time-synced lyrics with real-time playback
- **Responsive UI**: Tailwind-powered components for seamless mobile/desktop experience
- **Type Safety**: Full TypeScript support for robust development
- **Server-Side Rendering**: Leverage Next.js for fast, SEO-friendly pages

## Tech Stack
- Next.js 14+
- React 18
- TypeScript 5+
- Tailwind CSS
- Spotify Web API
- Firebase (Authentication & Storage)

## Project Architecture

The project follows a modular architecture with clear separation of concerns:

### `/lib` - External Service Configuration
External service integrations following Next.js conventions:
- `firebase/` - Firebase configuration
- `spotify/` - Spotify client setup

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

### Directory Purposes

#### `components/`
React components specific to the module/feature:
- **Modules**: Reusable UI components (e.g., `AuthGuard.tsx`, `SpotifyWebPlayer.tsx`)
- **Features**: Feature-specific UI (e.g., analysis visualizations, comparison tables)
- Keep components close to where they're used
- Co-locate component styles if needed

#### `hooks/`
Custom React hooks for component logic:
- **Modules**: Data fetching hooks (e.g., `useAuth.ts`, `useSpotifyApi.ts`)
- **Features**: Feature-specific state management (e.g., analysis state, comparison filters)
- Extract reusable logic from components
- Follow React hooks naming convention (`use*`)

#### `services/`
Business logic and external API interactions:
- **Modules**: API clients and data transformation (e.g., `spotifyAuthService.ts`)
- **Features**: Feature operations (e.g., analysis algorithms, comparison logic)
- Keep services framework-agnostic when possible
- Return typed data structures

#### `types/`
TypeScript type definitions:
- Interface definitions for module/feature data
- Type guards and utility types
- API response types
- Props interfaces for components

#### `utils/`
Helper functions and utilities:
- Pure functions for data transformation
- Formatting and parsing utilities
- Constants and configuration helpers
- Should not depend on React or external services

#### `context/` (optional)
React Context providers:
- Used when state needs to be shared across multiple components
- Example: `SpotifyPlayerContext.tsx` for playback state

#### `config/` (optional)
Configuration files:
- Feature-specific constants
- Color schemes and themes
- Default values and settings

#### `index.ts`
Public API exports:
- Export only what other modules/features need
- Keep internal implementation details private
- Provides a clean interface for the module/feature

### Example: Lyrics Module Structure

```
modules/lyrics/
  ├── components/
  │   ├── LyricsEditor.tsx
  │   ├── SyncedLyrics.tsx
  │   └── VowelLegend.tsx
  ├── hooks/
  │   ├── useSavedSong.ts
  │   └── useSongLyrics.tsx
  ├── types/
  │   ├── lyrics.ts
  │   └── track.ts
  ├── utils/
  │   ├── lrc.ts              # LRC format parsing
  │   ├── lyrics.ts           # Lyrics transformation
  │   └── track.ts            # Track utilities
  ├── config/
  │   └── rhyme-colors.ts     # Color mapping config
  └── index.ts                # Exports public API
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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Available Scripts
- `npm run dev`: Starts the development server
- `npm run build`: Builds the app for production
- `npm run start`: Starts the production server
- `npm run lint`: Runs ESLint for code quality

## Development Guidelines

### Adding New Features
1. **Modules**: Add foundational functionality to `/modules` (e.g., new data sources)
2. **Features**: Build user-facing capabilities in `/features` using existing modules
3. **Core**: Add pure domain logic to `/core/analyzers` or `/core/processors`
4. **Services**: External integrations go in `/lib`

### Code Organization Best Practices
- **Keep components close to their feature/module**: Avoid a global `/components` directory
- **Use hooks for reusable logic**: Extract component logic into custom hooks
- **Services should be framework-agnostic**: Avoid React dependencies in services
- **Export through index.ts**: Control what's exposed from each module/feature
- **Share utilities within directories**: Keep utils close to where they're used
- **Use TypeScript for all new code**: Leverage type safety throughout
- **Follow existing naming conventions**: Use consistent file and variable naming

### Import Patterns
```typescript
// Good: Import from module's public API
import { useAuth, AuthGuard } from '@/modules/auth';

// Good: Import from feature's public API
import { AnalysisChart } from '@/features/analysis';

// Avoid: Direct imports from internal structure
import { useAuth } from '@/modules/auth/hooks/useAuth';
```