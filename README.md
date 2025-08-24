# Confluencer Client

A lightweight, swipe-first feed that mixes content from multiple "confluencers" into a smooth, mobile-friendly experience. Built with React + Vite.

Key bits:
- Smooth, swipeable UI: touch, mouse drag, wheel, and keyboard navigation with snap-scrolling and an animation guard.
- Media polish: confluencer-specific backgrounds and poses with robust fallbacks, preloading for images/audio/video.
- Responsive

## Getting started

Requirements:
- Node.js 18+ (recommended)

Install dependencies:

```
npm install
```

Run in development (HMR):

```
npm run dev
```

Build for production:

```
npm run build
```

Preview the production build locally:

```
npm run preview
```

Lint:

```
npm run lint
```

## Configuration

Environment variables (all are optional; sensible defaults are used for local dev):

- VITE_API_BASE_URL: Base URL of the backend API that serves summaries. If not set, the app uses "/api" and expects a dev proxy during local development.
- VITE_B2_BUCKET: Backblaze B2 bucket name for audio (default: confluenceraudio).
- VITE_B2_KEY / VITE_B2_SECRET: Credentials if you need signed access (the client primarily uses public URLs).
- VITE_B2_REGION: B2 region (default: us-east-005).
- VITE_B2_ENDPOINT: S3-compatible endpoint (default: https://s3.us-east-005.backblazeb2.com).
- VITE_B2_PUBLIC_URL_BASE: Public URL base for audio files (default: https://f005.backblazeb2.com/file/confluenceraudio).

Place static media under `public/`:
- Backgrounds: `public/images/backgrounds/`
- Poses: `public/images/poses/{brain|girl|financer}/`
- Videos: `public/video/` (top-right quadrant background video; e.g., `subwaySurfers.mp4`)
- Audio: can be served via Backblaze public URLs or any CORS-accessible host

## API contract

The client fetches summaries for each confluencer:

- GET `${VITE_API_BASE_URL || '/api'}/summaries?confluencer={brain|girl|financer}`

Expected response per item (fields are lenient; the client normalizes them):

```
{
	"title": "string",
	"text": "string",              // used if no sections[] provided
	"summary": "string",           // alternative to text
	"sections": [                   // optional; if present, overrides text/summary
		{
			"text": "string",
			"audio": "string",         // or audioUrl | audioKey
			"action": "thinking"        // maps to pose filenames; see /src/enums/actions.js
		}
	],
	"background": "/images/backgrounds/brain.png", // optional; otherwise inferred by confluencer
	"sourceUrl": "https://...",     // used to de-duplicate across lists
	"confluencer": "brain"          // server may include; client also sets it based on request
}
```

Notes:
- The client interleaves the three confluencer lists round-robin, skips duplicates by `sourceUrl`, then lightly jitters order for variety.
- Audio URLs may be absolute (https://...) or object keys (e.g., `audio/file.mp3`), which are resolved against `VITE_B2_PUBLIC_URL_BASE`.

## UX details

- Intro screen: tap/click to start; animated influencer-inspired loading messages cycle while fetching.
- Slides: one per item; each can have multiple sections aligned with audio; a one-word-at-a-time overlay is synced to audio duration.
- Poses: action images change with each word; fallbacks: confluencer explaining1 → brain action → brain explaining1.
- Backgrounds: confluencer-specific if available; safe fallback to `background1.png`.
- Video: when the user swipes rapidly, a random video from `public/video/` is shown in the top-right quadrant; videos are preloaded and fade in when ready.
- Controls: swipe (touch/mouse drag), mouse wheel, or ↑/↓ keys; interactions are briefly disabled during smooth scroll animations to avoid jank.
- Final slide: a friendly end-of-feed message.

## Project structure

```
src/
	components/
		Feed.jsx     # main feed experience
		Feed.css     # layout and animations (video quadrant, pose bob, etc.)
	enums/
		actions.js   # pose filename mapping (e.g., explaining1, thinking, etc.)
		confluencers.js
	hooks/
		useBackblazeAudio.js  # helper for B2 audio URL building
public/
	images/ backgrounds & poses
	video/   background videos
	audio/   optional local audio (or serve via B2)
```

## Adding more videos

- Drop MP4 files into `public/video/`.
- Update the list in `Feed.jsx` (`fetchVideoList`) to include your new filenames.

## Deployment

The app builds to static assets with Vite and can be served from any static host. Ensure your API is reachable at `VITE_API_BASE_URL` (or provide a reverse proxy to `/api`).

## Troubleshooting

- Audio won’t play automatically: most browsers require a user gesture first—tap the intro screen to start.
- Empty feed: confirm your API endpoint returns arrays for each confluencer and that CORS is configured.
- Missing images/poses: verify files exist under `public/images/...`; the app will fall back but logs can help spot typos.

