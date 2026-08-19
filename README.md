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

## Deploying to Vercel + Turso

This app is a Next server with server-rendered API routes, so it needs a Node host rather than a static one.
The database is [Turso](https://turso.tech) (libSQL), reached over the network through `@libsql/client`, so the data is durable and independent of the host's filesystem.

Deployment has not been run end to end yet — the steps below are the intended path, not a transcript of a completed deploy.

1. Create a Turso database and copy its URL and auth token.
2. Apply the schema and seed the admin account from your machine, run from the `my-app` folder.
   Both scripts read `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` from `.env.local` and connect to the remote database over the network, so they do not need to run on the host:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

3. Vercel Dashboard → import the repo. It builds with `npm run build`; no `vercel.json` is needed for a stock Next app.
4. Set the environment variables on the Vercel project:
   - `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` — from step 1.
   - `IRON_SESSION_PASSWORD` — a fresh random value, at least 32 characters.
   - `ADMIN_PASSWORD` — a fresh admin password. The seed default sitting in git history becomes a dead credential once you set this.
   - `APP_BASE_URL` — the deployed origin, no trailing slash. The Google callback URL is derived from it.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional. The "Continue with Google" button stays hidden until `GOOGLE_CLIENT_ID` is set.
   - `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` — **required**. Signup emails a verification code and fails loudly without them, rather than silently dropping mail and leaving new users unable to verify.
   - `NEXT_PUBLIC_DONATE_URL` — optional, used by the donation panel.
5. In Google Cloud (see the section above), register `<APP_BASE_URL>/api/auth/google/callback` as an authorized redirect URI.
6. Add the edge rate-limit rule (see below).
7. Smoke-test the live site: accounts, subscription, admin dashboard, and Google sign-in.

### Rate limiting — one manual step after the first deploy

The app enforces its own limits in code, so it is safe on any host without this.
The Vercel rule is a cheaper layer in front of them and is worth adding, because traffic it mitigates costs nothing at all: no CDN request, no function invocation, and therefore no database write.

Firewall → New Rule → **If** request path starts with `/api/` → **Then** Rate Limit.

Hobby includes one rate-limit rule per project, keyed on IP, with a fixed window between 10 seconds and 10 minutes and 1,000,000 allowed requests a month, plus three custom firewall rules.
One rule cannot express the per-endpoint limits the code applies, so set it as a blunt ceiling that only catches gross abuse — well above what a real visitor produces — and leave the tuned limits to `lib/security/limits.ts`.

This cannot live in the repository, which is why it is a checklist item rather than configuration.

### Email deliverability — a known weak point

Mail is sent from a `gmail.com` address through Brevo.
A third-party relay cannot align DMARC for a domain it does not control, so a share of verification codes will be filed as spam.

The app is built around that rather than pretending otherwise: the verify screen says to check the spam folder, users can request a new code on a 60-second cooldown, and an admin can mark an account verified from the user list when delivery fails entirely.

The real fix is a domain you own. It is a drop-in change when you want it — same Brevo account, verify the domain instead of the single address, and update `BREVO_SENDER_EMAIL`.

### Live game stats

`.github/workflows/stats.yml` refreshes the stats snapshot every 6 hours and publishes it to the `stats-data` branch.
GitHub only schedules workflows from the repository's default branch, so this job is dormant on any other branch.

It needs `YOUTUBE_API_KEY` in the repository secrets.
`HYPIXEL_API_KEY` is currently commented out in the workflow pending a build-step stall diagnosis, so the Hypixel-backed badge falls back to the bundled seed snapshot until that is resolved.
