# Eddie Zeng — Gaming Portfolio

## Getting started

Requires Node.js 20+.

```bash
npm install      # first time only — dependencies are already vendored in node_modules
npm run dev      # start the dev server at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Sign in with Google — setup

1. Google Cloud Console → create/select a project.
2. APIs & Services → OAuth consent screen → configure (External; add your email as a test user while unpublished).
3. APIs & Services → Credentials → Create credentials → OAuth client ID → **Web application**.
4. Authorized redirect URIs: add `http://localhost:3000/api/auth/google/callback` (dev) and your production `https://<host>/api/auth/google/callback`.
5. Copy the Client ID and Client secret into `.env.local` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, and set `APP_BASE_URL`.
6. Restart `npm run dev`.