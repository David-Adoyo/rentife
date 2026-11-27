# Decisions

## D-001 · Brand colours come from the logo, not masterplan §8.2
The masterplan specified emerald and gold. The supplied logo is plum and pink, so the tokens are sampled from it:
plum `#4A2052` (primary), pink `#E94098` (accent: decorative, large text, on dark only, 3.3:1 on cream),
pink-700 `#B0236C` for pink text on light backgrounds (5.7:1, WCAG AA). Status colours are unchanged from §8.2.

## D-002 · Layout follows the structure of mastercard.com/us
Requested by the owner. We reuse the section pattern only (floating pill nav with mega menus, rounded hero panel,
split headline, stadium story carousel, zig-zag oval tiles joined by arcs, raised container with outlined
stadium cards, large media panel, dark four-column footer). No Mastercard copy, imagery, logos or code is used.

## D-003 · One typeface: DM Sans
Matches the geometric logo wordmark and the all-sans look of the reference layout. Playfair Display (§8.3) is not used.

## D-004 · AI-generated people, illustrated product scenes
People photos (hero, oval tiles, stadium cards, page heroes) were generated in Figma AI
(file "Rentife — Website People") at the owner's request. They show fictional Kenyan people, not real
individuals; wardrobe and setting match each section (landlords, agents, caretakers, tenants, diaspora
owners). The home carousel shows generated rental properties typical of Nairobi areas instead. Web copies are WebP in `public/people/`; full-size PNG masters stay in Figma and out of git.
Product scenes (receipts, ring, feed) remain HTML illustrations with fictional demo data until real
app screenshots exist. Swap in licensed or commissioned photography ({{PHOTO_SOURCE}}) if preferred.

## D-005 · Booking leads live in a `rentife` schema inside the MedTRANS Supabase project
The Supabase organisation is on the free plan, whose two active projects are both in use. With the
owner's agreement, Rentife leads are stored in `rentife.leads` inside the MedTRANS project, walled off:
row-level security is on, `anon`/`authenticated` have no grants, and the website connects as
`rentife_writer`, a login that can only INSERT into that one table (no reads, no other schemas).
Schema in `db/001_leads.sql`. The connection string is a sensitive Vercel env var (`DATABASE_URL`).
Move to a dedicated Rentife project when one is available.

## D-006 · Prices set from competitor research
At the owner's request, the `{{PLAN_*}}`/`{{PRICE_PER_UNIT}}` placeholders were replaced with real prices:
Starter KSh 80/unit (1–30 units, min 800), Growth KSh 60/unit (31–100, min 2,400), Agency KSh 40/unit
(101+ or any agent, min 6,000), per occupied unit per month, excl. VAT. Logic lives in `src/content/pricing.ts`;
research and reasoning in `docs/pricing-research.md`.

## D-007 · Staff admin for leads at /admin
A small staff area ahead of the masterplan's Stage 11 admin console. Email + password (scrypt) and a
mandatory authenticator code (TOTP, secret encrypted with AES-256-GCM). Accounts are created only by
one-time invite links (24 h, stored as SHA-256). Five failed attempts lock the account for 15 minutes.
Sessions are signed, HttpOnly, SameSite=Strict cookies scoped to /admin (12 h) and can be revoked
everywhere by bumping `session_version`. The app connects as `rentife_admin_app`, which can read leads,
update only `status` and `notes`, and append to `rentife.audit_log`. Schema in `db/002_admin.sql`.

## D-008 · Dedicated Supabase project "Rentife" (supersedes D-005)
At the owner's request MedTRANS was paused to free a free-plan slot, and Rentife moved to its own project
(eu-west-1, Ireland). Leads, admin accounts and the audit log were copied across intact. Migrations in
`db/000`–`003` rebuild everything: extensions (pg_cron, pgmq, pg_net, vault, postgis, pg_trgm, citext),
queues `payments_ingest`, `messages_outbox`, `pdf_render`, private buckets `meter-photos`,
`inspection-photos`, `documents`, `pdfs`, `imports`, and a nightly invite clean-up job. Auth is set to the
live site, 12-character passwords and authenticator MFA; phone sign-in stays off until an Africa's Talking
SMS hook exists. Vercel functions run in dub1 next to the database.
Free-plan limits still apply (no backups, pauses after ~7 days idle, 500 MB) — upgrade to Pro before real rent data.
