# 🔍 StackSage Frontend

Next.js frontend for the StackSage multi-agent codebase onboarding system.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (custom dark theme)
- **Zustand** (global state)
- **TanStack Query** (server state + caching)
- **D3.js** (dependency graph visualization)
- **Framer Motion** (animations)
- **Lucide React** (icons)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — hero, agent overview, repo list |
| `/repo/[repoId]` | Repo detail — 5 tabs for each agent |

## Quick Start

```bash
# Install
npm install

# Configure
cp .env.local.example .env.local

# Run (make sure backend is on :8000)
npm run dev

# Open http://localhost:3000
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Homepage / dashboard
│   ├── globals.css          # Tailwind + custom styles
│   └── repo/[repoId]/
│       └── page.tsx         # Repo detail with tabs
├── components/
│   ├── layout/
│   │   └── sidebar.tsx      # Navigation sidebar
│   ├── repo/
│   │   ├── architecture-tab.tsx  # D3.js graph + layers
│   │   ├── entry-points-tab.tsx  # PageRank results
│   │   ├── ask-tab.tsx           # RAG Q&A chat
│   │   ├── glossary-tab.tsx      # Searchable terms
│   │   └── change-impact-tab.tsx # Impact analyzer
│   └── ui/
│       ├── ingest-modal.tsx      # Add repo modal
│       └── progress-bar.tsx      # Analysis progress
├── hooks/
│   └── use-api.ts           # TanStack Query hooks
├── lib/
│   ├── api.ts               # API client
│   ├── utils.ts             # Helpers (cn, formatters)
│   └── query-provider.tsx   # React Query provider
├── stores/
│   └── app-store.ts         # Zustand global state
└── types/
    └── index.ts             # TypeScript types
```
