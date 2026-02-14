# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Black Health Intelligence — an Australian healthcare technology portfolio website built with Next.js 15. Premium dark-themed showcase of healthcare innovations, with portfolio management, internal Xero accounting tools, and personal budget tracking via Up Bank.

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
- **AI**: Vercel AI Gateway (`lib/ai/gateway.ts`) routing GPT-4o for both Xero and budget assistants
- **Email**: Resend (contact/enquiry forms)
- **Accounting**: Xero API (Custom Connection, client_credentials grant)
- **Banking**: Up Bank API (`lib/up/`) for personal budget tracking
- **Animations**: Framer Motion
- **Deployment**: Vercel

## Architecture

### Route Structure

**Public pages** — `/`, `/about`, `/faq`, `/platform`
- Server-rendered, fetch project data from Supabase
- No authentication required

**Admin area** — `/admin/*` (requires Supabase Auth login)
- `/admin` — Dashboard with navigation to all tools
- `/admin/login` — Login page
- `/admin/settings` — Site settings
- `/admin/projects` — Project CRUD (list, new, `[id]/edit`)
- `/admin/solutions` — Solutions page content editor
- `/admin/budget` — Personal budget dashboard (Up Bank integration, categories, limits, business expenses, ATO reporting)
- `/admin/xero/bulk-void` — Bulk void Xero invoices
- `/admin/xero/bulk-delete` — Bulk delete Xero invoices
- `/admin/xero/clearing-helper` — Clearing account reconciliation
- `/admin/xero/invoice-cleanup` — Invoice cleanup (strip allocations before voiding)
- `/admin/xero/assistant` — AI-powered Xero assistant (streaming)

**API routes** — `/api/*`
- `/api/contact`, `/api/enquiry` — Form submissions via Resend
- `/api/ai-format` — AI formatting helper
- `/api/admin/notifications` — Notification management
- `/api/xero/health` — Xero health check
- `/api/xero/bulk-void` — Execute bulk void
- `/api/xero/bulk-delete` — Execute bulk delete
- `/api/xero/paid-wipe` — Wipe paid invoices
- `/api/xero/invoice-cleanup` — Invoice cleanup execution
- `/api/xero/assistant` — Streaming AI assistant
- `/api/xero/clearing/{summary,apply,report}` — Clearing account reconciliation
- `/api/budget/{sync,accounts,transactions,categories,limits,assistant}` — Budget operations
- `/api/budget/business-expenses` + `/rules` — Business expense tracking and categorisation rules
- `/api/budget/ato-report` — ATO tax reporting

### Key Directories

- `app/` — Next.js App Router pages, layouts, API routes
- `components/admin/` — ProjectForm, SolutionsContentEditor, badge/tag editors
- `components/sections/` — Hero, PortfolioSection, About, Footer, Navigation, page client components
- `components/modals/` — Contact, Enquiry, PartnerLogin modals
- `components/ui/` — Animated backgrounds (FlowField, Neural, PacMan, Pong, TechGrid), ProjectCard, ProjectDetailModal
- `lib/supabase/` — Server client (`server.ts`), browser client (`client.ts`), session middleware (`middleware.ts`)
- `lib/xero/` — Xero API client, auth helper, assistant tool definitions, knowledge base, types
- `lib/up/` — Up Bank API client, types, assistant tool definitions, knowledge base
- `lib/ai/` — AI gateway abstraction (Vercel AI Gateway → GPT-4o)
- `lib/types.ts` — Shared types (Project, SolutionsContent, SiteSetting, badge/tag types)

### Data Flow

- **Server Actions** in `app/admin/actions.ts` for mutations (e.g., `updateProjectOrder`)
- **API routes** handle Xero/Up operations and form submissions — protected by `requireAdmin()` from `lib/xero/auth.ts`
- **Middleware** (`middleware.ts`) refreshes Supabase session on every request via `updateSession()`, redirects unauthenticated users from `/admin/*` to `/admin/login`
- **Server Components** by default; `'use client'` only when state/interactivity is needed

### Database (Supabase)

**Tables:** `projects`, `solutions_content`, `site_settings`
**Storage:** `project-logos` bucket (public)
**Auth:** Email/password via Supabase Auth; any authenticated user has admin access
**RLS:** Public can view non-archived projects; authenticated users have full CRUD

### Xero Integration

- **Auth**: Custom Connection using `client_credentials` grant — token cached 30s (also supports `refresh_token` grant)
- **Client**: `lib/xero/client.ts` — batching constants: `BATCH_SIZE=100`, `VOID_BATCH_SIZE=25`, `BATCH_DELAY_MS=1500`, `VOID_BATCH_DELAY_MS=2000`
- **Bulk Void**: Batches of 100 invoices, 1.5s rate-limit delay between batches, dry-run support
- **Invoice Cleanup**: Strips all allocations (payments, credit notes, overpayments, prepayments) before voiding
- **Clearing Helper**: Matches NAB deposits to clearing-account transactions by amount, creates bank transfers
- **AI Assistant**: GPT-4o with tool calling (P&L, balance sheet, trial balance, bank summary, invoices, contacts) — streams via Vercel AI SDK

### Up Bank Integration

- **Auth**: Personal access token via `UP_API_TOKEN` env var
- **Client**: `lib/up/client.ts` — accounts, categories, transactions with auto-pagination
- **Budget**: Categories, spending limits, business expense tracking, ATO reporting
- **AI Assistant**: GPT-4o with Up-specific tools — streams via Vercel AI SDK

### AI Architecture

Both AI assistants (Xero and budget) route through the Vercel AI Gateway (`lib/ai/gateway.ts`), using `@ai-sdk/openai-compatible` to call `openai/gpt-4o`. Each assistant has its own tool definitions and knowledge base files in `lib/xero/` and `lib/up/` respectively.

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
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side bulk operations (budget sync)
- `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_TENANT_ID` — Xero Custom Connection
- `XERO_NAB_ACCOUNT_ID`, `XERO_CLEARING_ACCOUNT_ID`, `XERO_FEE_ACCOUNT_CODE` — Clearing helper
- `UP_API_TOKEN` — Up Bank personal access token
- `VERCEL_AI_GATEWAY_API_KEY` — Vercel AI Gateway (routes AI calls to GPT-4o)
- `OPENAI_API_KEY` — AI formatting (direct, not via gateway)
- `RESEND_API_KEY` — Email sending

## Conventions

- Australian English spelling (colour, behaviour, organisation)
- PascalCase for components, camelCase for hooks/utils, kebab-case for directories
- Images served from Supabase Storage via Next.js Image (remote pattern: `cnjxbthwxpkartbapfmk.supabase.co`)
