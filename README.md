# Fitness Tracker web

Minimal mobile-first PWA for the Fitness Tracker API. React, TypeScript, Vite, Tailwind, TanStack Query, SignalR.

## Live: 
https://fitness-tracker-web-app-psi.vercel.app

## Run locally

```bash
cp .env.example .env      # set VITE_API_URL to your API
npm install
npm run dev               # http://localhost:5173 (port is fixed; the API's CORS list expects it)
```

`npm run build` type-checks and produces `dist/`. `npm run preview` serves the production build.

## Structure

```
src/
  lib/api.ts                  base URL, JWT handling, typed endpoints, error parsing
  auth.tsx                    login / register / logout context
  hooks/useNotificationStream.ts   SignalR connection (refreshes reminders live)
  components/                 Layout (header + bottom tabs), shared UI helpers
  pages/                      Login, Dashboard, LogFood, LogExercise, History
```

## Deploy (any static host)

Vercel, Netlify or Cloudflare Pages all work.

- Root directory: `web`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL` (your API's base URL, no trailing slash)

`vercel.json` and `public/_redirects` make deep links fall back to `index.html`.

After the first deploy, allow the site's origin in the API (Render environment variables):

```
Cors__AllowedOrigins__0=https://your-site.example
Cors__AllowedOrigins__1=http://localhost:5173
```

Array env vars replace the matching indexes from `appsettings.json`, so list every origin you need.

## Notes

- The JWT is kept in `localStorage`. That is simple and fine for a portfolio app; an httpOnly cookie is the hardened alternative.
- The dashboard sends the browser's UTC offset so the API computes the user's local day.
- Reminders arrive live while the app is open. Background push while it is closed would need web push.
