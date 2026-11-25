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
