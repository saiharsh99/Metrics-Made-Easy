# Lens — Unified LP Analytics Dashboard (GA4 + Microsoft Clarity)

## Original problem statement
"connect google analytics & microsoft clarity data in a unified dashboard to view LP performance"

## Architecture
- **Frontend**: React 19 + React Router + Recharts + shadcn/ui + Phosphor Icons. Swiss & High-Contrast design (light zinc palette, Chivo + IBM Plex Sans).
- **Backend**: FastAPI (async) + Motor/MongoDB. GA4 via `google-analytics-data` (service-account auth). Clarity via Data Export API (Bearer token). In-process TTL cache (2h) for Clarity to respect 10/day quota.
- **Demo mode**: Deterministic demo data keyed off LP URL + date, used as fallback whenever credentials are missing or a provider call fails.

## User personas
- **Growth / PMM**: wants to compare LP performance in one place (the "what" from GA4 + the "why" from Clarity).
- **Product/UX**: hunts rage and dead clicks, watches engagement scores.
- **CRO analyst**: compares date ranges, tracks conversion rate against bounce.

## Core requirements (static)
1. Dashboard combining GA4 + Clarity for every landing page.
2. Custom date range selector + realtime view.
3. Advanced filtering and period-vs-period comparison.
4. Per-LP deep dive: traffic, conversions, devices, geography, frustration hotspots, session recordings.
5. Credentials management UI with clear instructions (no CLI required).
6. Monochrome Swiss dashboard feel, Chivo display + IBM Plex body.

## What's been implemented — 2026-02 (v1 MVP)
- Backend: full CRUD for landing pages; credentials store + status; analytics endpoints `/summary`, `/overview`, `/ga4/traffic-sources`, `/ga4/devices`, `/ga4/countries`, `/realtime`, `/clarity`, `/compare`. 3 LPs auto-seeded on first boot.
- Frontend pages: Dashboard, Landing Pages (list + create dialog + delete), Landing Page Detail (8 KPI cards + traffic area chart + realtime panel + conversions/bounce line + device donut + tabs for Sources, Frustration, Sessions, Geography), Compare (dual date range + overlay chart + delta KPIs), Settings (GA4 + Clarity connect cards with step-by-step instructions).
- Demo-mode works out-of-the-box; connection badges in header show GA4/Clarity state.
- `data-testid` on every interactive / informational element.
- Testing: 19/19 backend pytest tests pass, full frontend flow validated (100% success on both).

## P0 / P1 / P2 backlog
**P0 (blocking for real usage)** — none; app is fully functional in demo mode and live-ready once credentials are added.
**P1 (post-MVP polish)**
- Switch from sequential `await` in `/analytics/summary` to `asyncio.gather` for multi-LP fan-out under live credentials.
- Invalidate Clarity cache on credential save/delete.
- Migrate FastAPI `on_event` hooks to new lifespan context.
- Export CSV / PNG for charts and tables.
- Scheduled daily pull of Clarity aggregates into MongoDB for historical trend (API only exposes 1–3 days).
**P2 (nice-to-have)**
- Multi-workspace / multi-tenant support.
- Alerting rules (e.g. "rage clicks > X on LP").
- Annotation layer (mark campaign/launch dates on the traffic chart).
- Embedded Clarity heatmap iframes per hotspot.

## Next tasks
1. Add real GA4 service-account JSON + Clarity token via Settings → verify live data flow.
2. Add CSV export + alerting rules.
3. Split `server.py` into routers (`credentials`, `landing_pages`, `analytics`).
