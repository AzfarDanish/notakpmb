# NotaKPMB

A digital archive of study materials (PDF, DOC, DOCX, TXT) for KPMB students, organized by programme and subject, stored in Cloudflare, and readable entirely in the browser.

## Features

- **Programme → Subject → File browsing** — Each programme page lists its subjects; each subject page lists its documents.
- **In-browser previews** — DOCX rendered to HTML (`mammoth`); XLSX/XLS/CSV in a spreadsheet viewer (`xlsx`); images and common code/script files with dedicated viewers; everything else (PDF, DOC, TXT, …) opens in a native iframe preview.
- **Search** — A search page covers programmes, subjects, and file names/titles.
- **Subject management** — Add, rename, and delete subjects. Deleting soft-deletes the subject and removes its files from R2. Actions appear only when R2 credentials are configured.
- **Publish a document** — A per-subject "Contribute" panel uploads PDF/DOC/DOCX/TXT files (up to 5 MB).
- **Download** — Any file can be streamed back to the client.

## Architecture

- **Cloudflare R2** (via `@aws-sdk/client-s3`) stores files at `{subjectId}/{category}/{timestamp}-{filename}`, with `title` and `originalName` kept as object metadata. File *content* always lives in R2.
- **Supabase PostgreSQL** holds all metadata: the programmes table, the course catalog, a subject change ledger (rows typed `custom`, `rename`, `deletion`, `hidden`), feedback + votes + rate limits, and admin tables (activity, notes, pins, status history, file index).
- **Supabase Auth** protects the private `/admin` area. The public archive stays anonymous.
- **Base catalog in code** (`lib/data.ts`): the programmes live in Supabase and the base subject lists live in code, merged with the ledger at read time (renames applied, deletions/hides filtered, custom subjects appended). If Supabase is unconfigured or unreachable, pages fall back to the static catalog.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js](https://nextjs.org/) 16 (Turbopack), App Router |
| UI | [React](https://react.dev/) 19, [Tailwind CSS](https://tailwindcss.com/) v4 |
| Language | TypeScript |
| Motion / icons | `motion`, `lucide-react` |
| Document previews | `mammoth`, `xlsx` |
| Storage | Cloudflare R2 via `@aws-sdk/client-s3` (files); Supabase PostgreSQL via `@supabase/supabase-js` (metadata) |
| Auth | Supabase Auth (admin only; public stays anonymous) |
| Tooling | pnpm, ESLint |

## Getting started

**Prerequisites:** Node.js 20+, [pnpm](https://pnpm.io/)

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # production build
pnpm start        # serve the build
```

## Configuration

Copy `.env.example` to `.env.local` and fill in your Supabase + Cloudflare credentials:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (**server-only, never expose**) |
| `ADMIN_EMAILS` | Comma-separated owner emails allowed into `/admin` (fallback if no `app_metadata.admin` flag) |
| `R2_ACCOUNT_ID` | Cloudflare account ID, used in the R2 endpoint |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket that holds the files |

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com), then run `supabase/migrations/0001_nota_schema.sql` in the SQL Editor (creates tables + RLS).
2. Create your admin user (Authentication → Users), then either set its `app_metadata` to `{"admin": true}` or add its email to `ADMIN_EMAILS`.
3. Migrate existing data (needs the old D1 credentials one last time):

```bash
export $(grep -v '^#' .env.local | xargs)
node scripts/migrate-d1-to-supabase.mjs
```

> When Supabase is not configured or unreachable, reads fall back to the code-side catalog.
> Endpoints that need the database return an error (e.g. `503` from `/api/subjects`, `500` from `/api/upload`).

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST`   | `/api/subjects` | Add a subject to a programme |
| `PATCH`  | `/api/subjects?id=…` | Rename a subject (title/code) |
| `DELETE` | `/api/subjects?id=…` | Delete a subject (soft-delete + R2 file purge) |
| `POST`   | `/api/upload` | Upload a document under a subject |
| `GET`    | `/api/download?key=…` | Download / preview a document |
| `DELETE` | `/api/delete?key=…` | Delete a single document |

## Project structure

```
app/
├── (site)/
│   ├── layout.tsx           # Site shell + footer
│   ├── page.tsx             # Home — programme index with file/subject counts
│   ├── programme/[id]/      # Programme page: subjects + subject management
│   └── search/              # Search page
├── subject/[id]/            # Subject page: documents, previews, contribute
├── api/                     # upload / download / delete / subjects
├── layout.tsx               # Root layout: fonts, metadata, GA4
├── globals.css
└── icon.png                # Tab favicon (static PNG)
components/                  # SubjectList, DocumentSection, previewers,
│                            # ContributePanel, SearchInput, Breadcrumbs, …
lib/
├── data.ts                  # Base programme/subject catalog (static fallback)
├── subjects.ts              # Subject ledger + catalog merge + subject CRUD (Supabase)
├── supabase.ts              # Supabase clients (browser/server/service-role) + fallback helper
├── r2.ts                    # R2 client: list, search, counts, documents (unchanged)
└── fileKinds.ts             # File type → viewer mapping
supabase/migrations/         # PostgreSQL schema (0001 is the current schema)
scripts/                     # One-off D1 → Supabase data migration
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Build for production |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |

## Contributing

Contributions of study materials are welcome — every subject page has a publish panel for adding documents to the archive.