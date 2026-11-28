# Rentife

**Rent that collects itself.** Marketing website for Rentife: rent collection, receipts, records and property operations for Kenyan landlords, agents and diaspora owners.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Pages

`/` · `/how-it-works` · `/for-agents` · `/for-diaspora-owners` · `/pricing` · `/security` · `/book-setup` · `/legal/{terms,privacy,dpa}`

## Brand assets and favicons

The source logos live in `brand-source/`. `npm run icons` (Python 3 + Pillow) removes the white background and writes:

| File | Size | Use |
|---|---|---|
| `src/app/favicon.ico` | 16, 32, 48 | Browser tab |
| `src/app/icon.png` | 512 (transparent) | `<link rel="icon">` |
| `src/app/apple-icon.png` | 180 (ivory tile) | iOS home screen |
| `public/icon-192.png`, `public/icon-512.png` | 192, 512 | Web manifest |
| `public/icon-maskable-512.png` | 512 (80% safe zone) | Android adaptive icon |
| `public/brand/*` | — | Logo mark and wordmark, colour and white |

## Booking leads

`/book-setup` saves leads to `rentife.leads` in Supabase (`db/001_leads.sql`). Set `DATABASE_URL` (see `.env.example`); without it, local development prints leads to the console instead. View leads in the Supabase dashboard: project **Rentife** → Table Editor → schema `rentife` → `leads`.

## Landlord app (Stage 3)

`/signup` → confirm email → set up two-step sign-in → create organisation → `/app`. Properties, units
(codes like `SUN-B4`, plus alternative codes), tenants and tenancies, team invitations and an activity log.
Permissions live in Postgres RLS (`db/004_core.sql`); run `db/tests/rls.sql` to prove them (51 checks).
Requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `RESEND_API_KEY`.

## Onboarding and import (Stage 4)

New landlords go through `/app/onboarding` (7 steps). Units and tenants can be imported from Excel/CSV
(`/app/register-template`) on step 3 or any property page. Photo import needs `ANTHROPIC_API_KEY` on Vercel.
`npm test` runs the register-parsing tests; `db/tests/rls.sql` the database security checks (62).

## Billing and ledger (Stage 5)

`/app/billing` (invoices by month, recurring charges, billing runs, “Run billing now”) and `/app/tenants/<id>`
(balance, statement, invoices, charges, credit notes, waivers, write-offs, rent changes). PDFs:
`/app/billing/invoices/<id>` and `/app/tenants/<id>/statement?from=YYYY-MM-DD`. The nightly run is
`/api/cron/billing` (Vercel Cron); it needs `CRON_SECRET` and `DATABASE_BILLING_URL` (the `rentife_billing` role).
Tests: `npm test` (engine), `db/tests/rls.sql` (84 checks) and `npx tsx tests/billing-seed.ts` (prints a
rolled-back SQL script that simulates six months and reconciles balances; run it against the database).

## Admin

Staff sign in at `/admin` (email, password and an authenticator code) to work the leads: filter by status, search, call or WhatsApp, update status and notes, export CSV. Accounts are created by one-time invite links (see `docs/admin.md`). Requires `DATABASE_ADMIN_URL` and `SESSION_SECRET`.

## Placeholders

Values not confirmed yet (prices, contacts, ODPC number, legal text, demo video) are shown as `{{TOKENS}}` and live in `src/content/site.ts`. Testimonials are hidden until real ones exist.

## Not done yet

- People photos are AI-generated (Figma) fictional people; product scenes are illustrations with demo data. Swap in real screenshots when the app exists.
- Kiswahili, `/rental-income-tax`, `/resources`, `/help`, `/about`, `/login` and `/signup` are not built.
