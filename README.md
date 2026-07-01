# האקדמיה למתמטיקה של שחר

A small booking site for a math tutor: a public weekly schedule where parents
reserve a seat, and a `/admin` area where the teacher manages the schedule and
booking requests. Built with Next.js 16 (App Router) + Supabase.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
```

## Environment variables

Set these in `.env.local` (local) **and** in your Netlify project
(Site settings → Environment variables) for production:

| Variable | Public? | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon key — used only to *read* the schedule in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | **no — secret** | Service-role key. Used only by server route handlers; bypasses RLS |
| `ADMIN_PASSWORD` | **no — secret** | Password for the `/admin` area |

Get the service-role key from Supabase → Project Settings → API → `service_role`.

## Security model

All booking data (names, parent names, phone numbers) and every schedule edit go
through **server-side route handlers** under `src/app/api/`, which use the
service-role key. The browser's anon key can only *read* the schedule.

This is enforced by Row Level Security. **You must run [`supabase-schema.sql`](supabase-schema.sql)**
(the `alter table ... enable row level security` + policy section) in the
Supabase SQL editor. Until you do, the anon key can still read/write everything.

### Activation checklist

1. Run `supabase-schema.sql` in the Supabase SQL editor (enables RLS + policies).
2. Set `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_PASSWORD` in `.env.local` and on Netlify.
3. Redeploy, then smoke-test: book a slot as a visitor, and log into `/admin`.

## Project layout

- `src/app/page.tsx` — public landing page (Hero, schedule grid, testimonials)
- `src/app/admin/page.tsx` — teacher admin area (login → bookings + schedule editor)
- `src/app/api/` — server route handlers (bookings, admin auth, admin CRUD)
- `src/lib/serverDb.ts` — server-side data access (service role)
- `src/lib/types.ts` — shared types, constants, and public *read* helpers
- `src/lib/adminApi.ts` — browser-side wrappers that call the API routes
