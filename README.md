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

## Placeholders

Values not confirmed yet (prices, contacts, ODPC number, legal text, demo video) are shown as `{{TOKENS}}` and live in `src/content/site.ts`. Testimonials are hidden until real ones exist.

## Not done yet

- `/api/book-setup` validates leads but only writes them to the server log. It needs the database (masterplan Stage 3) before launch.
- Product scenes are illustrations with demo data. Swap them for real screenshots and licensed photos.
- Kiswahili, `/rental-income-tax`, `/resources`, `/help`, `/about`, `/login` and `/signup` are not built.
