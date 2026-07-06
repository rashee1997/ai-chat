<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Artifact Studio AI

An AI chat app with live-streaming interactive artifacts — Word documents,
PowerPoint slides, Excel spreadsheets, multi-file React projects (rendered
live via Sandpack), single-page HTML web apps, SVGs, and Mermaid diagrams —
with real-time editing, version history, and binary exports.

Originally scaffolded from Google AI Studio: https://ai.studio/apps/dbe56795-ec9e-4a9d-9b6b-ff0f68ccfbea

## Run locally

**Prerequisites:** Node.js, a Postgres database (see [Database](#database) below).

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `GEMINI_API_KEY` — your Gemini API key
   - `DATABASE_URL` — a Postgres connection string (see below)
3. Apply the database schema:
   `npx prisma migrate deploy`
4. Run the app:
   `npm run dev`

## Database

There is one persistence implementation, used identically in every
environment — local dev, Vercel preview, and Vercel production. It's Postgres
via [Prisma](https://www.prisma.io) (`lib/prisma.ts`, `lib/db.ts`,
`prisma/schema.prisma`); which database it talks to is controlled entirely by
the `DATABASE_URL` environment variable. There's no separate "local mode" —
point `DATABASE_URL` at whatever Postgres instance you want for that
environment.

- **Local dev**: point it at a local Postgres, or a free-tier hosted one
  (Prisma Postgres, Neon, Supabase all work).
- **Vercel**: set `DATABASE_URL` in Project Settings → Environment Variables.
  If you're using [Prisma Postgres](https://www.prisma.io/postgres), use the
  **direct connection** string from its dashboard — not the
  `prisma+postgres://` Accelerate-pooled one, which is a proprietary proxy
  protocol the `@prisma/adapter-pg` driver adapter this app uses can't dial
  directly.

Schema changes are tracked as SQL migrations in `prisma/migrations/` (not
just `db push`), so they're reviewable and repeatable:

```bash
npm run db:migrate   # create + apply a migration locally (prisma migrate dev)
npm run db:deploy    # apply pending migrations non-interactively (prisma migrate deploy)
npm run db:studio    # browse the database in Prisma Studio
```

Run `db:deploy` once against your production `DATABASE_URL` before first
deploy, and again after any future schema change (e.g. by setting Vercel's
Build Command to `prisma migrate deploy && next build`, or running it
manually from your machine against the production connection string).

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Set the environment variables above (`GEMINI_API_KEY`, `DATABASE_URL`) in
   Project Settings → Environment Variables.
3. Deploy. `npm run build` already runs `prisma generate` via the
   `postinstall` script, so the Prisma client is regenerated on every deploy
   automatically.
4. Run `npx prisma migrate deploy` against the production `DATABASE_URL`
   (see above) before the first request hits the app.

No other Vercel-specific configuration is required — API routes that talk to
Postgres or make outbound requests already declare `export const runtime =
"nodejs"`, and the Gemini background-agent webhook derives its own callback
URL from the incoming request's `Host` header rather than a hardcoded
`APP_URL`.
