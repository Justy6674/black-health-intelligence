# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Black Health Intelligence — an Australian healthcare technology portfolio website built with Next.js 15. Premium dark-themed showcase of healthcare innovations, with portfolio management, and internal Xero accounting tools (bulk void, clearing reconciliation, AI assistant).

## Commands

```bash
npm run dev          # Next.js dev server (port 3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
```

No test runner is currently configured.

## Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19, TypeScript 5 (strict mode ON)
- **Styling**: Tailwind CSS 3.4 with custom metallic/dark theme
- **Database/Auth**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: Vercel AI SDK + OpenAI (GPT-4o for Xero assistant)
- **Email**: Resend (contact/enquiry forms)
- **Accounting**: Xero API (Custom Connection, client_credentials grant)
- **Animations**: Framer Motion
- **Deployment**: Vercel

## Architecture

### Route Structure

**Public pages** — `/`, `/about`, `/faq`, `/platform`
- Server-rendered, fetch project data from Supabase
- No authentication required

**Admin area** — `/admin/*` (requires Supabase Auth login)
- `/admin` — Dashboard
- `/admin/login` — Login page
- `/admin/projects` — Project CRUD (list, new, `[id]/edit`)
- `/admin/solutions` — Solutions page content editor
- `/admin/xero/bulk-void` — Bulk void Xero invoices
- `/admin/xero/clearing-helper` — Clearing account reconciliation
- `/admin/xero/assistant` — AI-powered Xero assistant (streaming)

**API routes** — `/api/*`
- `/api/contact`, `/api/enquiry` — Form submissions via Resend
- `/api/ai-format` — AI formatting helper
- `/api/xero/bulk-void` — Execute bulk void
- `/api/xero/clearing/summary` — Clearing transaction summary
- `/api/xero/clearing/apply` — Apply clearing reconciliation
- `/api/xero/assistant` — Streaming AI assistant endpoint

### Key Directories

- `app/` — Next.js App Router pages, layouts, API routes
- `components/admin/` — ProjectForm, SolutionsContentEditor, badge/tag editors
- `components/sections/` — Hero, PortfolioSection, About, Footer, Navigation
- `components/modals/` — Contact, Enquiry, PartnerLogin, ProjectDetail modals
- `components/ui/` — Animated backgrounds (FlowField, Neural, PacMan, Pong, TechGrid), ProjectCard
- `lib/supabase/` — Server client (`server.ts`), browser client (`client.ts`), session middleware (`middleware.ts`)
- `lib/xero/` — Xero API client, auth helper, assistant tool definitions, types

### Data Flow

- **Server Actions** in `app/admin/actions.ts` for mutations (e.g., `updateProjectOrder`)
- **API routes** handle Xero operations and form submissions — protected by `requireAdmin()` from `lib/xero/auth.ts`
- **Middleware** (`middleware.ts`) refreshes Supabase session on every request via `updateSession()`
- **Server Components** by default; `'use client'` only when state/interactivity is needed

### Database (Supabase)

**Tables:** `projects`, `solutions_content`, `site_settings`
**Storage:** `project-logos` bucket (public)
**Auth:** Email/password via Supabase Auth; any authenticated user has admin access
**RLS:** Public can view non-archived projects; authenticated users have full CRUD

### Xero Integration

- **Auth**: Custom Connection using `client_credentials` grant — token cached 30s
- **Bulk Void**: Batches of 100 invoices, 1.5s rate-limit delay between batches, dry-run support
- **Clearing Helper**: Matches NAB deposits to clearing-account transactions by amount, creates bank transfers
- **AI Assistant**: GPT-4o with tool calling (P&L, balance sheet, trial balance, bank summary, invoices, contacts) — streams via Vercel AI SDK

### Styling System

Dark metallic theme with custom Tailwind tokens:
- Backgrounds: `deep-black` (#0a0a0a), `charcoal` (#1a1a1a)
- Accents: `slate-blue` (#334155), `warm-brown` (#b68a71), `cream` (#f7f2d3)
- Custom `silver` and `metallic` colour scales
- Gradients: `metallic-gradient`, `dark-gradient`, `accent-gradient`
- Shadows: `glow`, `glow-lg`, `metallic`, `inner-glow`
- Animations: `fade-in`, `slide-up`, `glow-pulse`, `float`
- CSS classes in `globals.css`: `.heading-chrome`, `.heading-xl/lg/md/sm`, `.card`, `.btn-primary`, `.btn-secondary`, `.text-gradient`

## Path Alias

`@/*` maps to `./*` (project root, NOT `src/`)

## Environment Variables

See `.env.example`. Key variables:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_TENANT_ID` — Xero Custom Connection
- `XERO_NAB_ACCOUNT_ID`, `XERO_CLEARING_ACCOUNT_ID` — Clearing helper (optional)
- `OPENAI_API_KEY` — AI assistant
- `RESEND_API_KEY` — Email sending

## Conventions

- Australian English spelling (colour, behaviour, organisation)
- PascalCase for components, camelCase for hooks/utils, kebab-case for directories
- Images served from Supabase Storage via Next.js Image (remote pattern: `cnjxbthwxpkartbapfmk.supabase.co`)
