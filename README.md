# Home Finder Fast

A mobile-first house-finding platform for tenants and landlords. Public visitors can browse available rentals, view photo galleries, and contact landlords directly. Landlords can create an account, upload photos, and manage their own listings from a private dashboard.

This project is built as a working MVP, not a static prototype.

## What Is Included

- Public landing page with recent listings
- Browse page with pagination and empty states
- House detail page with responsive gallery, lightbox, call, and WhatsApp links
- Landlord registration and login with 9-digit Cameroon phone validation
- Private landlord dashboard, profile, listing creation, editing, deletion, and availability controls
- Admin dashboard with listings and landlord management views
- Supabase Auth, PostgreSQL tables, Row Level Security, and Storage integration
- Private storage bucket with app-served public image endpoint
- Saved houses for signed-in tenants
- Listing reports for trust and safety review
- Contact click analytics for call and WhatsApp actions
- IndexedDB-backed cached browsing for faster repeat visits and offline reads
- PWA service worker for static shell and navigation caching
- No seeded/mock listings in the application data model

## Tech Stack

- React 19
- TypeScript
- TanStack Router / TanStack Start
- Vite
- Tailwind CSS
- Supabase Auth, Database, and Storage
- React Query
- IndexedDB browser cache
- ESLint and Prettier

## Getting Started

### 1. Install Dependencies

Use Node 22 or newer.

```bash
npm install
```

If Vite/Rolldown fails with `Cannot find native binding`, reinstall dependencies:

```bash
rm -rf node_modules package-lock.json
npm install
```

### 2. Configure Environment Variables

Production environment variables are managed in Vercel. The GitHub Actions workflow pulls the production values from Vercel during the build, so no `.env` file is used by CI or deployment.

For local development only, you may create `.env` in the project root:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_or_secret_key

VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Notes:

- `VITE_SUPABASE_*` values are exposed to the browser and must use the publishable key only.
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose it in client code.
- If a secret key was ever pasted into chat, commits, logs, or screenshots, rotate it in Supabase before deploying.
- `.env` is ignored by git and must never be committed. If it was already tracked, untrack it with:

```bash
git rm --cached .env
```

### 3. Configure Supabase

The app expects these Supabase resources:

- Tables: `profiles`, `user_roles`, `houses`, `house_images`, `favorite_houses`, `listing_reports`, `contact_events`
- Enums: `app_role`, `house_type`, `availability_status`
- Storage bucket: `house-images`
- RLS policies from the migrations in `supabase/migrations`
- RPC helper: `admin_landlords`

Apply migrations to your Supabase project using the Supabase CLI or the Supabase SQL editor.

```bash
supabase db push
```

## CI/CD

GitHub Actions runs smoke checks, TypeScript validation, and linting on pull requests targeting `main` and on pushes to `main`. Production is built and deployed to Vercel only after a successful push to `main` (including a merged pull request). In-progress runs for the same branch are cancelled so newer commits finish faster.

Add these GitHub repository secrets before enabling the workflow:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_SCOPE` (optional; set this to the Vercel team/user slug when the project belongs to a team and the CLI cannot infer scope from the project metadata)
- `SUPABASE_ACCESS_TOKEN` (optional; enables migration status checks in CI)
- `SUPABASE_PROJECT_REF` (optional, required with `SUPABASE_ACCESS_TOKEN`; links CI to the Supabase project before checking migrations)

The `production` GitHub environment can be configured with required reviewers if production deployments need approval. Branch protection should require the `Quality checks` status check before merging into `main`.

If you are not using the CLI, run the migration SQL files in order from `supabase/migrations`.
The migrations create and harden the private `house-images` bucket. They intentionally do not create a first admin user.

After deployment, confirm production has every migration:

```bash
supabase migration list --linked
```

### 4. Run The App

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

## Available Scripts

```bash
npm run dev
```

Starts the local Vite development server.

```bash
npm run build
```

Builds the production app.

```bash
npm run preview
```

Serves the production build locally.

```bash
npm run lint
```

Runs ESLint across the project.

```bash
npm run test:smoke
```

Runs a small repository smoke check for the core setup, trust, and tracking pieces.

```bash
npm run format
```

Formats the project with Prettier.

## Main Routes

| Route                         | Purpose                           |
| ----------------------------- | --------------------------------- |
| `/`                           | Landing page with recent listings |
| `/houses`                     | Public house browsing             |
| `/houses/:id`                 | Public house detail page          |
| `/landlord/login`             | Landlord login                    |
| `/landlord/register`          | Landlord registration             |
| `/landlord/dashboard`         | Private landlord dashboard        |
| `/landlord/listings`          | Landlord listing manager          |
| `/landlord/listings/new`      | Create a listing                  |
| `/landlord/listings/:id/edit` | Edit a listing                    |
| `/landlord/profile`           | Landlord profile                  |
| `/admin`                      | Admin overview                    |
| `/admin/listings`             | Admin listing management          |
| `/admin/landlords`            | Admin landlord management         |

## Data And Security Model

Public users can only read available houses and related images. Landlords can create and manage only their own houses. Admin users can view and manage all listings.

Ownership is enforced with Supabase RLS, not only frontend checks. Image files are stored in the private `house-images` bucket under each landlord's user ID. Public pages load listing photos through `/api/public/img/:path`, which validates access before streaming the object.

## Offline And Caching

The public browsing experience uses IndexedDB to cache listing data. On repeat visits, cached houses render immediately while the app refreshes from Supabase in the background. Filtered URLs use separate cache keys, and when the browser comes back online, cached queries refetch automatically.

Landlord create, update, and delete actions require an active connection. The MVP intentionally does not include an offline mutation queue.

## Supabase Key Checklist

In Supabase, open **Project Settings > API** and copy:

- Project URL -> `SUPABASE_URL` and `VITE_SUPABASE_URL`
- Publishable key -> `SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Secret/service-role key -> `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

Use the secret/service-role key only on the server.

## No Mock Data

The schema migrations do not seed demo houses, demo landlords, or placeholder photos. A cleanup migration is included to remove the earlier starter rows from databases that already received them.

Real listings should be created through the landlord flow or inserted intentionally through Supabase admin tooling.

## Troubleshooting

### Images Upload But Do Not Show Publicly

Check that:

- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` is present on the server
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are present for the browser
- The `house-images` bucket exists
- The migration that creates storage policies has been applied
- The house is marked `available` for public browsing

### Login Or Registration Fails

Check that Supabase Auth is enabled and the environment variables point to the same Supabase project used by the database migrations.

### Native Dependency Error After Install

This usually means npm missed an optional native package. Reinstall from a clean dependency tree:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Project Notes

This project is connected to Lovable. Avoid force-pushing, rebasing, amending, or squashing commits that have already been pushed to the connected branch, because that can break Lovable project history.
