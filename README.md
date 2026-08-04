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

- **Cloudflare R2** (via `@aws-sdk/client-s3`) stores files at `{subjectId}/{category}/{timestamp}-{filename}`, with `title` and `originalName` kept as object metadata.
- **Cloudflare D1** (SQLite) is read through a small `fetch` wrapper (`lib/d1.ts`) and holds the programmes table plus a subject change ledger — rows typed `custom`, `rename`, or `deletion`. It stores only user changes.
- **Base catalog in code** (`lib/data.ts`): the programmes are held in D1 and the base subject lists live in code, merged with the D1 ledger at read time (renames applied, deletions filtered, custom subjects appended). If D1 is unconfigured or unreachable, pages fall back to the static catalog.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | [Next.js](https://nextjs.org/) 16 (Turbopack), App Router |
| UI | [React](https://react.dev/) 19, [Tailwind CSS](https://tailwindcss.com/) v4 |
| Language | TypeScript |
| Motion / icons | `motion`, `lucide-react` |
| Document previews | `mammoth`, `xlsx` |
| Storage | Cloudflare R2 via `@aws-sdk/client-s3`; Cloudflare D1 via `fetch` |
| Tooling | pnpm, ESLint, [Wrangler](https://developers.cloudflare.com/workers/wrangler/) |

## Getting started

**Prerequisites:** Node.js 20+, [pnpm](https://pnpm.io/)

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # production build
pnpm start        # serve the build
```

## Configuration

Copy `.env.example` to `.env.local` and fill in your Cloudflare credentials:

| Variable | Purpose |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare account ID, used in the R2 endpoint |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket that holds the files |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID for the D1 API |
| `CLOUDFLARE_API_TOKEN` | Token with **D1 → Edit** permission |
| `D1_DATABASE_ID` | Your D1 database UUID |

### D1 setup

1. Create a database (Workers & Pages → D1) and copy its UUID into `D1_DATABASE_ID`.
2. Create an API token (My Profile → API Tokens → **Edit Cloudflare Workers**) with **Workers D1** permissions.
3. Apply the schema:

```bash
npx wrangler d1 execute <database-name> --remote --file=migrations/0003_slim.sql
```

> When D1 is not configured or unreachable, reads fall back to the code-side catalog.
> Endpoints that need the storage layer return an error (e.g. `503` from `/api/subjects`, `500` from `/api/upload`).

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
├── subjects.ts              # D1 ledger + catalog merge + subject CRUD
├── d1.ts                    # D1 REST client + fallback helper
├── r2.ts                    # R2 client: list, search, counts, documents
└── fileKinds.ts             # File type → viewer mapping
migrations/                  # SQL migrations (0003 is the current schema)
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