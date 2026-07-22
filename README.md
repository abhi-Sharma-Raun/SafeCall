# SafeCall

SafeCall is a MERN hackathon MVP for real-time detection and alerting for digital arrest scam calls.

## Structure

- `client` - React + Vite + Tailwind call surface and command dashboard
- `server` - Express + Socket.IO signaling, mock detection API, and MongoDB persistence
- `server/models` - Session, Alert, and IncidentReport schemas

## Design System

- Dashboard background: `#12151A`
- Dashboard surface: `#1B1F27`
- Institutional accent: `#3E6E8E`
- Caution amber: `#B68A4A`
- Critical red: `#8E4B4B`
- Call surface base: `#F5F7FA`
- Sans: `IBM Plex Sans`
- Mono: `IBM Plex Mono`

## Run

1. Install dependencies in each package.
2. Set `server/.env` with `PORT` and optionally `MONGODB_URI`.
3. Set `client/.env` with `VITE_API_BASE_URL` and `VITE_DETECTION_SERVICE_BASE_URL` if needed.
4. Run `npm run dev` from the repo root.