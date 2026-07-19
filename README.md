# NotaKPMB

An academic archive for browsing and reading study materials — notes, exercises, and past exams — organized by semester and subject.

## Features

- **Semester-based browsing** — Content grouped into semesters
- **Subject-organized documents** — Subjects listed under each semester with typed notes, exercises, and exams
- **Breadcrumb navigation** — Deep-link into any document in the archive hierarchy
- **Prev / Next document navigation** — Sequentially browse documents within a subject
- **Responsive design** — Two-column grid on desktop, single column on mobile
- **Contribute section** — Call-to-action for submitting study materials

## Tech Stack

- [Next.js](https://nextjs.org/) 16 — React framework
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) v4 — styling
- [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) + [Inter](https://fonts.google.com/specimen/Inter) — typography via `next/font`

## Getting Started

**Prerequisites:** Node.js, pnpm

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the archive.

## Project Structure

```
app/
├── page.tsx                    # Home — lists semesters
├── semester/
│   └── [id]/
│       ├── page.tsx            # Semester page — lists subjects
│       └── [subject]/
│           ├── page.tsx        # Subject page — lists documents
│           └── [doc]/
│               └── page.tsx    # Document reader
components/
└── ui/                         # Reusable UI components
public/                         # Static assets
```

## Contributing

Contributions of study materials are welcome. This project is in early development — check back for upload functionality.

## License

[MIT](LICENSE)
