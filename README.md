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

## Deploying to Render

This app is a Node server with a file-based SQLite database, so it runs as a single Render **Web Service** with a persistent disk (not a static host).
The `render.yaml` Blueprint in the repo root defines the service, disk, build/start commands, and pre-deploy migrations.

1. Push this branch (`deploy/render`) to GitHub.
2. Render Dashboard → **New → Blueprint** → connect the repo. Render reads `render.yaml` and creates the web service + persistent disk.
3. Set the secret env vars (the `sync: false` ones) in the service's **Environment** tab:
   - `IRON_SESSION_PASSWORD` — a fresh random value, at least 32 characters.
   - `ADMIN_PASSWORD` — a fresh admin password (the seed default in git history becomes a dead credential once you set this).
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — leave unset for now if Google Cloud isn't set up yet; the "Continue with Google" button stays hidden until `GOOGLE_CLIENT_ID` is set.
4. Deploy. The pre-deploy step (`db:migrate && db:seed`) runs migrations and seeds the admin automatically.
5. Copy the assigned URL (`https://<name>.onrender.com`) into `APP_BASE_URL`, then redeploy.
6. In Google Cloud (see the section above), register the production redirect URI `https://<name>.onrender.com/api/auth/google/callback` and set the two Google secrets in Render. The Google button then appears and works.
7. Smoke-test the live site: accounts, subscription, admin dashboard, and Google sign-in.
8. When satisfied, change `branch: deploy/render` to `branch: master` in `render.yaml` and merge to `master`; pushes to `master` then deploy automatically.

The SQLite file lives on the persistent disk at `/var/data/app.db`.
Keep the service to a single instance — SQLite is single-writer, so multiple replicas would corrupt it.
