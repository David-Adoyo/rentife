# Changelog

## 0.10.0 · 28 Nov 2026 — Stage 5
- Billing: rent and recurring charges (service charge, garbage, security, parking) are created every night, 5 days before each tenant’s due day. Safe to re-run: nothing is ever charged twice.
- Part months: tenants who move in or out mid-month pay only for their days (to the nearest shilling). Quarterly rent supported. Rent changes can be scheduled from a future month.
- Invoices (INV-2026-000001…) and tenant statements with a running balance, both as PDFs with M-Pesa payment details.
- One-off charges, credit notes, waivers and owner-only write-offs, each with a reason. Nothing is edited or deleted.
- New Billing page and tenant page; tenants list shows what each tenant owes. Caretakers never see money.
- Proven: 32 engine tests, 84 database security checks, and a six-month, 58-tenancy simulation that reconciles to the cent.

## 0.9.0 · 28 Nov 2026 — Stage 4
- Seven-step onboarding wizard, saved after every step: about you, first property, units and tenants, how tenants pay, tell your tenants, reminders, go live.
- Import units and tenants from Excel or CSV (template provided): live error highlighting, inline fixes, all-or-nothing import. 60 units in about 2 seconds.
- Photo-of-register import with Claude (switched off until an Anthropic API key is added; 20 photos per day per organisation).
- Bilingual "How to pay rent" A4 notice PDF per building, with every unit code.
- Payment method (Paybill, Till, bank Paybill or none yet) and reminder style saved for Stages 6–7.

## 0.8.0 · 28 Nov 2026 — Stage 3
- Landlord app at /app: sign-up, sign-in, email sign-in links, mandatory two-step sign-in for owners and managers.
- Organisations, five roles with property scopes, invitations by email, property owners (agency mode).
- Properties, units with automatic M-Pesa unit codes and alternative codes, tenants, move-in and move-out.
- Append-only activity log; RLS on every table with 51 automated isolation checks.

## 0.7.2 · 28 Nov 2026
- Site served at rentife.co.ke (www redirects); canonical URLs, sitemap and Supabase login links use the new domain.

## 0.7.1 · 27 Nov 2026
- Login emails via Resend from no-reply@rentife.co.ke with branded templates. Domain verified 28 Nov 2026; test sign-in email delivered.

## 0.7.0 · 27 Nov 2026
- Moved to a dedicated Supabase project "Rentife" with queues, private storage buckets, scheduled jobs, vault and Auth configured; server functions pinned to Dublin.

## 0.6.0 · 26 Nov 2026
- Staff admin at /admin: invite-only accounts, password plus authenticator sign-in, leads dashboard with status, notes, search, call and WhatsApp buttons, CSV export and an audit log.

## 0.5.0 · 26 Nov 2026
- Header links open their own pages (no drop-down menus); new For landlords page.
- Home page trimmed to hero, carousel, audiences, how it works, pricing at a glance and the final call to action. Before/after, demo panel, calculator and FAQ moved to For landlords.

## 0.4.0 · 26 Nov 2026
- Real prices: Starter KSh 80, Growth KSh 60, Agency KSh 40 per occupied unit per month, set from competitor research. Calculator now shows the real monthly cost.

## 0.3.1 · 25 Nov 2026
- Home page carousel now shows rental properties across Nairobi (Kasarani, Ruaka, Rongai, Kilimani, South B, Westlands) with a location label on each slide.

## 0.3.0 · 25 Nov 2026
- Booking leads are saved to Supabase through an insert-only database login; spam honeypot added.

## 0.2.0 · 25 Nov 2026
- People photography across the home page and page heroes, generated in Figma and graded to the brand palette.
- Mobile hero keeps the landlady visible beside the phone; captions mask the decorative arcs.

## 0.1.0 · 25 Nov 2026
- Marketing website: home, how it works, for agents, for diaspora owners, pricing, security, book a setup, legal placeholders, 404.
- Logo assets and favicons generated from the supplied logo.
- Cost-of-chasing calculator; book-a-setup form with validation.
