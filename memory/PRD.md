# Lens — Unified LP Analytics

## Original Problem Statement
Connect Google Analytics & Microsoft Clarity data in a unified dashboard to view LP performance.
- Custom date range selector; Real-time + historical data.
- Advanced filtering and comparison.
- Later requested: Ad platforms (Meta Ads, Google Ads), Organic (Google Search Console),
  and CRM integrations structured under specific navigation headers
  ("Landing page Experience", "Ad platforms", "Organic updates", "CRM level data").
- Latest requested: Ad-platform dashboards must support Campaign → Ad set / Ad group → Ad
  level monitoring with drill-down.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor). Single entrypoint `/app/backend/server.py`.
- **Frontend**: React + Tailwind + Shadcn UI + Recharts + Phosphor icons.
- **Global state**: `app-context.jsx` holds the selected LP, Date Range and refresh token. Toolbar
  appears on all data routes. Routes that aren't LP-scoped (Meta/Google/GSC/CRM) hide the LP picker.
- **Caching**: Microsoft Clarity is rate-limited to 10/day → MongoDB `clarity_snapshots` cache.

## Navigation (Left Sidebar — 4 sections + Settings)
1. **Landing page Experience** — Overview, Pages, Sources, Audience, Locations, Clarity, Compare.
2. **Ad platforms** — Meta Ads, Google Ads (each with Campaign → Ad set/Ad group → Ad drill-down).
3. **Organic updates** — Search Console.
4. **CRM level data** — CRM (demo: pipeline by stage, lead-source attribution, deal table).

## Implementation log
- 2026-04-28 — MVP: GA4 + Clarity unified dashboards, Settings flow, Live credentials with pre-save validation.
- 2026-04-28 — Added Sources, Audience, Locations, dedicated Clarity, global toolbar (LP + date range + refresh).
- 2026-04-28 — Clarity DB-cache to bypass 10/day API limit.
- 2026-04-28 — Restructured nav into 4 sections in a left sidebar; added Meta Ads, Google Ads,
  Search Console, CRM dashboards (DEMO data).
- 2026-04-28 — Ad platforms: added Campaign → Ad set / Ad group → Ad hierarchy with drill-down,
  breadcrumb pills and Reset button. Backend `marketing_demo.py` now generates child rows whose
  metrics sum back to parent (within ±0.05 spend / ±2 unit drift).

## Backlog
### P1
- Replace Meta Ads demo with **live Marketing API** (collect access token + ad-account id in Settings).
- Replace Google Ads demo with **live Google Ads API** (collect developer token + customer id + refresh token).
- Replace Search Console demo with **live Search Console API** (OAuth refresh token).
- Make landing-page seeding idempotent (currently only seeds when collection empty).
- Wrap `_parse_date` in try/except in marketing endpoints → 400 instead of 500 on bad date strings.

### P2
- AI Chatbots dashboard under "Organic updates" (Brand visibility on ChatGPT/Perplexity/Gemini).
- Live CRM integrations (HubSpot, Salesforce, Pipedrive, custom webhook).
- LRU cache on demo endpoints keyed on (start, end).
- Refactor: split 1600+ line `server.py` into `routes/credentials.py`, `routes/landing_pages.py`,
  `routes/analytics.py`, `routes/marketing.py`.
- Defensive `minWidth/minHeight` on the Recharts ResponsiveContainer (silences a width(-1) warning).

## Test status
- `pytest /app/backend/tests/` — 42/44 (2 pre-existing seed-related failures unrelated to current
  iteration). Marketing suite **17/17** including 4 hierarchy ID-consistency + sum-drift tests.
- Frontend Playwright walk-through: all data-testids present, drill-down works, breadcrumb pills clear
  filters individually, Reset returns to Campaigns level. Zero console errors after fix.

## Key endpoints
- `/api/landing-pages` — CRUD for tracked LPs
- `/api/credentials/status`, `/api/credentials`, `/api/credentials/test`
- `/api/cache/clear` — used by Refresh button
- `/api/analytics/{overview, summary, sources, audience, locations, clarity, compare, realtime}`
- `/api/analytics/ads/meta`, `/api/analytics/ads/google` — DEMO, includes campaigns + adsets/adGroups + ads
- `/api/analytics/organic/search-console` — DEMO
- `/api/analytics/crm` — DEMO

## Test credentials
N/A — no auth in app. GA4 Service Account JSON + Clarity API token are user-supplied and stored
in MongoDB `credentials` collection via the Settings UI.
