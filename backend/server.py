"""Unified GA4 + Clarity analytics dashboard backend."""
from __future__ import annotations

import logging
import os
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

from cachetools import TTLCache
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

from services.clarity_service import ClarityService
from services.demo_data import (
    generate_audience,
    generate_clarity,
    generate_country_breakdown,
    generate_device_breakdown,
    generate_ga4_timeseries,
    generate_locations,
    generate_realtime,
    generate_sources_aggregate,
    generate_traffic_sources,
)
from services.ga4_service import GA4Service

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

mongo_url = os.environ["MONGO_URL"]
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ["DB_NAME"]]

app = FastAPI(title="Unified LP Analytics")
api = APIRouter(prefix="/api")

clarity_cache: TTLCache = TTLCache(maxsize=128, ttl=60 * 60 * 2)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class LandingPage(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    url: str
    description: Optional[str] = ""
    ga_property_id: Optional[str] = None
    ga_path_filter: Optional[str] = None
    clarity_project_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LandingPageCreate(BaseModel):
    name: str
    url: str
    description: Optional[str] = ""
    ga_property_id: Optional[str] = None
    ga_path_filter: Optional[str] = None
    clarity_project_id: Optional[str] = None


class LandingPageUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    ga_property_id: Optional[str] = None
    ga_path_filter: Optional[str] = None
    clarity_project_id: Optional[str] = None


class CredentialsIn(BaseModel):
    provider: Literal["ga4", "clarity"]
    ga_service_account_json: Optional[str] = None
    ga_default_property_id: Optional[str] = None
    clarity_api_token: Optional[str] = None


class CredentialsStatus(BaseModel):
    ga4_connected: bool
    ga4_property_id: Optional[str] = None
    clarity_connected: bool
    demo_mode: bool


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _load_credentials() -> Dict[str, Any]:
    doc = await db.credentials.find_one({"_id": "global"}, {"_id": 0})
    return doc or {}


async def _save_credentials_field(field: str, value: Any) -> None:
    await db.credentials.update_one(
        {"_id": "global"}, {"$set": {field: value}}, upsert=True
    )


async def _get_ga4_service() -> Optional[GA4Service]:
    creds = await _load_credentials()
    json_str = creds.get("ga_service_account_json")
    prop_id = creds.get("ga_default_property_id")
    if not json_str or not prop_id:
        return None
    try:
        return GA4Service(json_str, prop_id)
    except Exception as exc:
        logger.warning("GA4 client init failed: %s", exc)
        return None


async def _get_clarity_service() -> Optional[ClarityService]:
    creds = await _load_credentials()
    token = creds.get("clarity_api_token")
    if not token:
        return None
    return ClarityService(token)


def _parse_date(value: str, default_delta_days: int = 0) -> date:
    if value in {None, "", "today"}:
        return date.today() - timedelta(days=default_delta_days)
    if value.endswith("daysAgo"):
        try:
            n = int(value.replace("daysAgo", ""))
            return date.today() - timedelta(days=n)
        except ValueError:
            pass
    return date.fromisoformat(value)


async def _lp_by_id(lp_id: str) -> Dict[str, Any]:
    lp = await db.landing_pages.find_one({"id": lp_id}, {"_id": 0})
    if not lp:
        raise HTTPException(status_code=404, detail="Landing page not found")
    return lp


def _kpi_delta(current: float, prev: float) -> float:
    if prev == 0:
        return 0.0 if current == 0 else 100.0
    return round((current - prev) / prev * 100.0, 2)


# ---------------------------------------------------------------------------
# Routes - health
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"service": "unified-lp-analytics", "version": "1.0.0"}


# ---------------------------------------------------------------------------
# Routes - credentials
# ---------------------------------------------------------------------------
@api.get("/credentials/status", response_model=CredentialsStatus)
async def credentials_status() -> CredentialsStatus:
    creds = await _load_credentials()
    ga_connected = bool(
        creds.get("ga_service_account_json") and creds.get("ga_default_property_id")
    )
    clarity_connected = bool(creds.get("clarity_api_token"))
    return CredentialsStatus(
        ga4_connected=ga_connected,
        ga4_property_id=creds.get("ga_default_property_id") if ga_connected else None,
        clarity_connected=clarity_connected,
        demo_mode=not (ga_connected and clarity_connected),
    )


@api.post("/credentials", response_model=CredentialsStatus)
async def save_credentials(payload: CredentialsIn) -> CredentialsStatus:
    if payload.provider == "ga4":
        if not (payload.ga_service_account_json and payload.ga_default_property_id):
            raise HTTPException(
                status_code=400,
                detail="ga_service_account_json and ga_default_property_id are required",
            )
        await _save_credentials_field(
            "ga_service_account_json", payload.ga_service_account_json
        )
        await _save_credentials_field(
            "ga_default_property_id", payload.ga_default_property_id
        )
    elif payload.provider == "clarity":
        if not payload.clarity_api_token:
            raise HTTPException(status_code=400, detail="clarity_api_token is required")
        await _save_credentials_field("clarity_api_token", payload.clarity_api_token)
    return await credentials_status()


@api.delete("/credentials/{provider}", response_model=CredentialsStatus)
async def delete_credentials(provider: Literal["ga4", "clarity"]):
    if provider == "ga4":
        await db.credentials.update_one(
            {"_id": "global"},
            {"$unset": {"ga_service_account_json": "", "ga_default_property_id": ""}},
        )
    else:
        await db.credentials.update_one(
            {"_id": "global"}, {"$unset": {"clarity_api_token": ""}}
        )
    return await credentials_status()


# ---------------------------------------------------------------------------
# Routes - landing pages
# ---------------------------------------------------------------------------
@api.post("/landing-pages", response_model=LandingPage)
async def create_landing_page(payload: LandingPageCreate) -> LandingPage:
    lp = LandingPage(**payload.model_dump())
    doc = lp.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.landing_pages.insert_one(doc)
    return lp


@api.get("/landing-pages", response_model=List[LandingPage])
async def list_landing_pages() -> List[LandingPage]:
    docs = await db.landing_pages.find({}, {"_id": 0}).to_list(500)
    out: List[LandingPage] = []
    for d in docs:
        if isinstance(d.get("created_at"), str):
            d["created_at"] = datetime.fromisoformat(d["created_at"])
        out.append(LandingPage(**d))
    return out


@api.get("/landing-pages/{lp_id}", response_model=LandingPage)
async def get_landing_page(lp_id: str) -> LandingPage:
    lp = await _lp_by_id(lp_id)
    if isinstance(lp.get("created_at"), str):
        lp["created_at"] = datetime.fromisoformat(lp["created_at"])
    return LandingPage(**lp)


@api.patch("/landing-pages/{lp_id}", response_model=LandingPage)
async def update_landing_page(lp_id: str, payload: LandingPageUpdate) -> LandingPage:
    await _lp_by_id(lp_id)
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if update:
        await db.landing_pages.update_one({"id": lp_id}, {"$set": update})
    return await get_landing_page(lp_id)


@api.delete("/landing-pages/{lp_id}")
async def delete_landing_page(lp_id: str) -> Dict[str, Any]:
    await _lp_by_id(lp_id)
    await db.landing_pages.delete_one({"id": lp_id})
    return {"deleted": True, "id": lp_id}


# ---------------------------------------------------------------------------
# Routes - analytics
# ---------------------------------------------------------------------------
def _summarise_timeseries(series: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not series:
        return {
            "sessions": 0,
            "users": 0,
            "pageviews": 0,
            "conversions": 0,
            "bounceRate": 0.0,
            "avgSessionDuration": 0.0,
            "conversionRate": 0.0,
        }
    sessions = sum(r.get("sessions", 0) for r in series)
    users = sum(r.get("users", 0) for r in series)
    pv = sum(r.get("pageviews", 0) for r in series)
    conv = sum(r.get("conversions", 0) for r in series)
    bounce_avg = sum(r.get("bounceRate", 0.0) for r in series) / len(series)
    dur_avg = sum(r.get("avgSessionDuration", 0.0) for r in series) / len(series)
    return {
        "sessions": sessions,
        "users": users,
        "pageviews": pv,
        "conversions": conv,
        "bounceRate": round(bounce_avg, 2),
        "avgSessionDuration": round(dur_avg, 2),
        "conversionRate": round(conv / sessions * 100 if sessions else 0.0, 2),
    }


def _map_ga4_timeseries(raw: Dict[str, Any]) -> List[Dict[str, Any]]:
    series = []
    for row in raw.get("rows", []):
        raw_date = str(row.get("date", ""))
        try:
            parsed = datetime.strptime(raw_date, "%Y%m%d").date().isoformat()
        except ValueError:
            parsed = raw_date
        series.append(
            {
                "date": parsed,
                "sessions": int(row.get("sessions", 0) or 0),
                "users": int(row.get("activeUsers", 0) or 0),
                "pageviews": int(row.get("screenPageViews", 0) or 0),
                "conversions": int(row.get("conversions", 0) or 0),
                "bounceRate": round(float(row.get("bounceRate", 0.0) or 0.0) * 100, 2),
                "avgSessionDuration": round(
                    float(row.get("averageSessionDuration", 0.0) or 0.0), 2
                ),
            }
        )
    series.sort(key=lambda r: r["date"])
    return series


async def _ga4_timeseries_for(
    lp: Dict[str, Any], start: date, end: date
) -> Dict[str, Any]:
    service = await _get_ga4_service()
    url_filter = lp.get("ga_path_filter") or ""
    if service:
        try:
            raw = service.timeseries(
                start.isoformat(), end.isoformat(), url_filter=url_filter or None
            )
            series = _map_ga4_timeseries(raw)
            return {"series": series, "summary": _summarise_timeseries(series)}
        except Exception as exc:
            logger.warning("GA4 timeseries failed, fallback to demo: %s", exc)
    return generate_ga4_timeseries(lp["url"], start, end)


async def _clarity_for(lp: Dict[str, Any], days: int) -> Dict[str, Any]:
    service = await _get_clarity_service()
    cache_key = f"clarity::{lp['id']}::{days}"
    if service and cache_key in clarity_cache:
        return clarity_cache[cache_key]
    if service:
        try:
            insights = service.project_live_insights(
                num_of_days=days, dimensions=["URL"]
            )
            summary_raw = insights if isinstance(insights, dict) else {}
            result = {
                "summary": {
                    "sessions": int(summary_raw.get("totalSessionCount", 0) or 0),
                    "rageClicks": int(summary_raw.get("totalRageClicks", 0) or 0),
                    "deadClicks": int(summary_raw.get("totalDeadClicks", 0) or 0),
                    "quickBacks": int(summary_raw.get("totalQuickBacks", 0) or 0),
                    "excessiveScroll": int(
                        summary_raw.get("totalExcessiveScroll", 0) or 0
                    ),
                    "avgScrollDepth": float(summary_raw.get("avgScrollDepth", 0) or 0),
                    "avgEngagementTime": float(
                        summary_raw.get("avgEngagementTime", 0) or 0
                    ),
                },
                "hotspots": [],
                "recordings": [],
                "raw": summary_raw,
            }
            clarity_cache[cache_key] = result
            return result
        except Exception as exc:
            logger.warning("Clarity fetch failed, fallback to demo: %s", exc)
    return generate_clarity(lp["url"], days)


@api.get("/analytics/overview")
async def analytics_overview(
    lp_id: str = Query(...),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    lp = await _lp_by_id(lp_id)
    end = _parse_date(end_date or "today")
    start = _parse_date(start_date or (end - timedelta(days=29)).isoformat())
    span = (end - start).days + 1
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=span - 1)

    ga = await _ga4_timeseries_for(lp, start, end)
    ga_prev = await _ga4_timeseries_for(lp, prev_start, prev_end)
    clarity_days = min(3, max(1, span))
    clarity = await _clarity_for(lp, clarity_days)

    s = ga["summary"]
    c = clarity["summary"]
    eng_score = max(
        0,
        min(
            100,
            round(
                (100 - s.get("bounceRate", 0)) * 0.4
                + (s.get("conversionRate", 0) * 6) * 0.25
                + c.get("avgScrollDepth", 0) * 0.2
                + max(
                    0,
                    40
                    - (
                        c.get("rageClicks", 0)
                        / max(c.get("sessions", 1), 1)
                        * 1000
                    ),
                )
                * 0.15,
                1,
            ),
        ),
    )

    kpis = [
        {
            "key": "sessions",
            "label": "Sessions",
            "value": s["sessions"],
            "format": "int",
            "source": "ga4",
            "delta": _kpi_delta(s["sessions"], ga_prev["summary"]["sessions"]),
        },
        {
            "key": "users",
            "label": "Users",
            "value": s["users"],
            "format": "int",
            "source": "ga4",
            "delta": _kpi_delta(s["users"], ga_prev["summary"]["users"]),
        },
        {
            "key": "pageviews",
            "label": "Pageviews",
            "value": s["pageviews"],
            "format": "int",
            "source": "ga4",
            "delta": _kpi_delta(s["pageviews"], ga_prev["summary"]["pageviews"]),
        },
        {
            "key": "conversionRate",
            "label": "Conversion rate",
            "value": s["conversionRate"],
            "format": "percent",
            "source": "ga4",
            "delta": _kpi_delta(
                s["conversionRate"], ga_prev["summary"]["conversionRate"]
            ),
        },
        {
            "key": "bounceRate",
            "label": "Bounce rate",
            "value": s["bounceRate"],
            "format": "percent",
            "source": "ga4",
            "delta": _kpi_delta(s["bounceRate"], ga_prev["summary"]["bounceRate"]),
            "lowerIsBetter": True,
        },
        {
            "key": "rageClicks",
            "label": "Rage clicks",
            "value": c["rageClicks"],
            "format": "int",
            "source": "clarity",
            "lowerIsBetter": True,
        },
        {
            "key": "deadClicks",
            "label": "Dead clicks",
            "value": c["deadClicks"],
            "format": "int",
            "source": "clarity",
            "lowerIsBetter": True,
        },
        {
            "key": "engagementScore",
            "label": "LP score",
            "value": eng_score,
            "format": "score",
            "source": "combined",
        },
    ]

    return {
        "lp": lp,
        "dateRange": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "previousStart": prev_start.isoformat(),
            "previousEnd": prev_end.isoformat(),
            "days": span,
        },
        "kpis": kpis,
        "ga4": ga,
        "clarity": clarity,
    }


@api.get("/analytics/ga4/traffic-sources")
async def analytics_sources(
    lp_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    lp = await _lp_by_id(lp_id)
    end = _parse_date(end_date or "today")
    start = _parse_date(start_date or (end - timedelta(days=29)).isoformat())
    service = await _get_ga4_service()
    if service:
        try:
            raw = service.traffic_sources(
                start.isoformat(),
                end.isoformat(),
                url_filter=lp.get("ga_path_filter") or None,
            )
            rows = []
            for r in raw.get("rows", []):
                rows.append(
                    {
                        "source": r.get("sessionSource", ""),
                        "medium": r.get("sessionMedium", ""),
                        "sessions": int(r.get("sessions", 0) or 0),
                        "bounceRate": round(
                            float(r.get("bounceRate", 0) or 0) * 100, 2
                        ),
                        "conversions": int(r.get("conversions", 0) or 0),
                    }
                )
            return {"rows": rows}
        except Exception as exc:
            logger.warning("GA4 sources failed, fallback to demo: %s", exc)
    return {"rows": generate_traffic_sources(lp["url"])}


@api.get("/analytics/ga4/devices")
async def analytics_devices(lp_id: str):
    lp = await _lp_by_id(lp_id)
    service = await _get_ga4_service()
    if service:
        try:
            end = date.today()
            start = end - timedelta(days=29)
            raw = service.devices(
                start.isoformat(),
                end.isoformat(),
                url_filter=lp.get("ga_path_filter") or None,
            )
            total = sum(int(r.get("sessions", 0) or 0) for r in raw.get("rows", [])) or 1
            rows = []
            for r in raw.get("rows", []):
                sessions = int(r.get("sessions", 0) or 0)
                rows.append(
                    {
                        "device": r.get("deviceCategory", "unknown"),
                        "sessions": sessions,
                        "share": round(sessions / total * 100, 1),
                    }
                )
            return {"rows": rows}
        except Exception as exc:
            logger.warning("GA4 devices failed, fallback to demo: %s", exc)
    return {"rows": generate_device_breakdown(lp["url"])}


@api.get("/analytics/ga4/countries")
async def analytics_countries(lp_id: str):
    lp = await _lp_by_id(lp_id)
    service = await _get_ga4_service()
    if service:
        try:
            end = date.today()
            start = end - timedelta(days=29)
            raw = service.countries(
                start.isoformat(),
                end.isoformat(),
                url_filter=lp.get("ga_path_filter") or None,
            )
            rows = []
            for r in raw.get("rows", []):
                rows.append(
                    {
                        "country": r.get("country", ""),
                        "users": int(r.get("activeUsers", 0) or 0),
                        "sessions": int(r.get("sessions", 0) or 0),
                    }
                )
            return {"rows": rows}
        except Exception as exc:
            logger.warning("GA4 countries failed, fallback to demo: %s", exc)
    return {"rows": generate_country_breakdown(lp["url"])}


@api.get("/analytics/realtime")
async def analytics_realtime(lp_id: str):
    lp = await _lp_by_id(lp_id)
    service = await _get_ga4_service()
    if service:
        try:
            raw = service.realtime(url_filter=lp.get("ga_path_filter") or None)
            total = sum(int(r.get("activeUsers", 0) or 0) for r in raw.get("rows", []))
            by_country = [
                {
                    "country": r.get("country", ""),
                    "activeUsers": int(r.get("activeUsers", 0) or 0),
                }
                for r in raw.get("rows", [])
            ]
            base = generate_realtime(lp["url"])
            base["activeUsers"] = total
            base["byCountry"] = by_country
            return base
        except Exception as exc:
            logger.warning("GA4 realtime failed, fallback to demo: %s", exc)
    return generate_realtime(lp["url"])


@api.get("/analytics/clarity")
async def analytics_clarity(lp_id: str, days: int = Query(1, ge=1, le=3)):
    lp = await _lp_by_id(lp_id)
    return await _clarity_for(lp, days)


@api.get("/analytics/compare")
async def analytics_compare(
    lp_id: str,
    period_a_start: str,
    period_a_end: str,
    period_b_start: str,
    period_b_end: str,
):
    lp = await _lp_by_id(lp_id)
    a_start = _parse_date(period_a_start)
    a_end = _parse_date(period_a_end)
    b_start = _parse_date(period_b_start)
    b_end = _parse_date(period_b_end)
    a = await _ga4_timeseries_for(lp, a_start, a_end)
    b = await _ga4_timeseries_for(lp, b_start, b_end)
    return {
        "a": {
            "label": f"{a_start} – {a_end}",
            "summary": a["summary"],
            "series": a["series"],
        },
        "b": {
            "label": f"{b_start} – {b_end}",
            "summary": b["summary"],
            "series": b["series"],
        },
        "delta": {k: _kpi_delta(a["summary"][k], b["summary"][k]) for k in a["summary"]},
    }


@api.get("/analytics/summary")
async def analytics_summary_all(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    end = _parse_date(end_date or "today")
    start = _parse_date(start_date or (end - timedelta(days=29)).isoformat())
    lps = await db.landing_pages.find({}, {"_id": 0}).to_list(500)
    rows = []
    totals = {
        "sessions": 0,
        "users": 0,
        "pageviews": 0,
        "conversions": 0,
        "rageClicks": 0,
        "deadClicks": 0,
    }
    bounce_vals: List[float] = []
    for lp in lps:
        ga = await _ga4_timeseries_for(lp, start, end)
        clarity = await _clarity_for(lp, min(3, max(1, (end - start).days + 1)))
        row = {
            "id": lp["id"],
            "name": lp["name"],
            "url": lp["url"],
            "sessions": ga["summary"]["sessions"],
            "users": ga["summary"]["users"],
            "conversions": ga["summary"]["conversions"],
            "conversionRate": ga["summary"]["conversionRate"],
            "bounceRate": ga["summary"]["bounceRate"],
            "rageClicks": clarity["summary"]["rageClicks"],
            "deadClicks": clarity["summary"]["deadClicks"],
            "avgScrollDepth": clarity["summary"]["avgScrollDepth"],
        }
        rows.append(row)
        totals["sessions"] += row["sessions"]
        totals["users"] += row["users"]
        totals["pageviews"] += ga["summary"]["pageviews"]
        totals["conversions"] += row["conversions"]
        totals["rageClicks"] += row["rageClicks"]
        totals["deadClicks"] += row["deadClicks"]
        bounce_vals.append(row["bounceRate"])
    avg_bounce = round(sum(bounce_vals) / len(bounce_vals), 2) if bounce_vals else 0.0
    totals["bounceRate"] = avg_bounce
    totals["conversionRate"] = round(
        totals["conversions"] / totals["sessions"] * 100 if totals["sessions"] else 0.0,
        2,
    )
    rows.sort(key=lambda r: r["sessions"], reverse=True)
    return {
        "dateRange": {"start": start.isoformat(), "end": end.isoformat()},
        "totals": totals,
        "rows": rows,
        "landingPageCount": len(rows),
    }


# ---------------------------------------------------------------------------
# Routes - aggregate insights (sources / audience / locations)
# ---------------------------------------------------------------------------
async def _resolve_scope(
    lp_id: Optional[str],
) -> tuple[List[Dict[str, Any]], List[str], Optional[str]]:
    """Return (lp_docs, lp_urls, ga_filter) for the requested scope.

    When ``lp_id`` is None or ``"all"`` we include every LP.
    The GA4 path filter is returned only when exactly one LP is targeted.
    """
    if lp_id and lp_id != "all":
        lp = await _lp_by_id(lp_id)
        return [lp], [lp["url"]], lp.get("ga_path_filter") or None
    docs = await db.landing_pages.find({}, {"_id": 0}).to_list(500)
    urls = [d["url"] for d in docs]
    return docs, urls, None


def _group_by_channel(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    buckets: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        ch = r.get("channel", "Other") or "Other"
        b = buckets.setdefault(
            ch,
            {"channel": ch, "sessions": 0, "users": 0, "conversions": 0},
        )
        b["sessions"] += int(r.get("sessions", 0) or 0)
        b["users"] += int(r.get("users", 0) or 0)
        b["conversions"] += int(r.get("conversions", 0) or 0)
    total = sum(b["sessions"] for b in buckets.values()) or 1
    out = []
    for b in buckets.values():
        b["conversionRate"] = round(
            b["conversions"] / b["sessions"] * 100 if b["sessions"] else 0.0, 2
        )
        b["share"] = round(b["sessions"] / total * 100, 1)
        out.append(b)
    out.sort(key=lambda r: r["sessions"], reverse=True)
    return out


@api.get("/analytics/sources")
async def analytics_sources_aggregate(
    lp_id: Optional[str] = Query(None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    lps, urls, ga_filter = await _resolve_scope(lp_id)
    end = _parse_date(end_date or "today")
    start = _parse_date(start_date or (end - timedelta(days=29)).isoformat())
    service = await _get_ga4_service()
    if service and (lp_id and lp_id != "all"):
        # Live mode only supports a single-LP filter today.
        try:
            raw = service.sources_aggregate(
                start.isoformat(), end.isoformat(), url_filter=ga_filter
            )
            rows = []
            for r in raw.get("rows", []):
                sessions = int(r.get("sessions", 0) or 0)
                conv = int(r.get("conversions", 0) or 0)
                new_users = int(r.get("newUsers", 0) or 0)
                users = int(r.get("activeUsers", 0) or 0)
                rows.append(
                    {
                        "channel": r.get("sessionDefaultChannelGroup", "Other"),
                        "source": r.get("sessionSource", ""),
                        "medium": r.get("sessionMedium", ""),
                        "sessions": sessions,
                        "users": users,
                        "newUsers": new_users,
                        "conversions": conv,
                        "conversionRate": round(
                            conv / sessions * 100 if sessions else 0.0, 2
                        ),
                        "bounceRate": round(
                            float(r.get("bounceRate", 0) or 0) * 100, 2
                        ),
                        "avgSessionDuration": round(
                            float(r.get("averageSessionDuration", 0) or 0), 2
                        ),
                    }
                )
            by_channel = _group_by_channel(rows)
            trend_raw = service.sources_trend(
                start.isoformat(), end.isoformat(), url_filter=ga_filter
            )
            trend_map: Dict[str, Dict[str, Any]] = {}
            for r in trend_raw.get("rows", []):
                raw_date = str(r.get("date", ""))
                try:
                    d = datetime.strptime(raw_date, "%Y%m%d").date().isoformat()
                except ValueError:
                    d = raw_date
                bucket = trend_map.setdefault(d, {"date": d})
                bucket[r.get("sessionDefaultChannelGroup", "Other")] = int(
                    r.get("sessions", 0) or 0
                )
            trend = sorted(trend_map.values(), key=lambda x: x["date"])
            totals = {
                "sessions": sum(r["sessions"] for r in rows),
                "users": sum(r["users"] for r in rows),
                "conversions": sum(r["conversions"] for r in rows),
                "conversionRate": round(
                    sum(r["conversions"] for r in rows)
                    / max(sum(r["sessions"] for r in rows), 1)
                    * 100,
                    2,
                ),
                "bounceRate": round(
                    sum(r["bounceRate"] for r in rows) / max(len(rows), 1), 2
                ),
                "avgSessionDuration": round(
                    sum(r["avgSessionDuration"] for r in rows) / max(len(rows), 1), 2
                ),
            }
            return {
                "scope": {"lpId": lp_id, "lpCount": len(lps)},
                "dateRange": {"start": start.isoformat(), "end": end.isoformat()},
                "totals": totals,
                "byChannel": by_channel,
                "bySource": rows,
                "trend": trend,
            }
        except Exception as exc:
            logger.warning("GA4 sources aggregate failed, fallback demo: %s", exc)
    data = generate_sources_aggregate(urls, start, end)
    return {
        "scope": {"lpId": lp_id or "all", "lpCount": len(lps)},
        "dateRange": {"start": start.isoformat(), "end": end.isoformat()},
        **data,
    }


@api.get("/analytics/audience")
async def analytics_audience(
    lp_id: Optional[str] = Query(None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    lps, urls, ga_filter = await _resolve_scope(lp_id)
    end = _parse_date(end_date or "today")
    start = _parse_date(start_date or (end - timedelta(days=29)).isoformat())

    demo = generate_audience(urls, start, end)
    service = await _get_ga4_service()
    if service and (lp_id and lp_id != "all"):
        try:
            dev_raw = service.audience_devices(
                start.isoformat(), end.isoformat(), ga_filter
            )
            brw_raw = service.audience_browsers(
                start.isoformat(), end.isoformat(), ga_filter
            )
            os_raw = service.audience_os(
                start.isoformat(), end.isoformat(), ga_filter
            )
            lang_raw = service.audience_languages(
                start.isoformat(), end.isoformat(), ga_filter
            )
            nvr_raw = service.audience_new_returning(
                start.isoformat(), end.isoformat(), ga_filter
            )

            def _share(rows: List[Dict[str, Any]], key: str, name_field: str):
                total = sum(int(r.get(key, 0) or 0) for r in rows) or 1
                out = []
                for r in rows:
                    s = int(r.get(key, 0) or 0)
                    out.append(
                        {
                            name_field: r.get(name_field, "") or r.get(
                                name_field.lower(), ""
                            ),
                            "sessions": s,
                            "share": round(s / total * 100, 1),
                        }
                    )
                return out

            devices = []
            total_sessions = sum(
                int(r.get("sessions", 0) or 0) for r in dev_raw.get("rows", [])
            ) or 1
            for r in dev_raw.get("rows", []):
                s = int(r.get("sessions", 0) or 0)
                devices.append(
                    {
                        "device": r.get("deviceCategory", "unknown"),
                        "sessions": s,
                        "share": round(s / total_sessions * 100, 1),
                    }
                )

            browsers = []
            total_b = sum(
                int(r.get("sessions", 0) or 0) for r in brw_raw.get("rows", [])
            ) or 1
            for r in brw_raw.get("rows", []):
                s = int(r.get("sessions", 0) or 0)
                browsers.append(
                    {
                        "browser": r.get("browser", ""),
                        "sessions": s,
                        "share": round(s / total_b * 100, 1),
                    }
                )

            operating_systems = []
            total_o = sum(
                int(r.get("sessions", 0) or 0) for r in os_raw.get("rows", [])
            ) or 1
            for r in os_raw.get("rows", []):
                s = int(r.get("sessions", 0) or 0)
                operating_systems.append(
                    {
                        "os": r.get("operatingSystem", ""),
                        "sessions": s,
                        "share": round(s / total_o * 100, 1),
                    }
                )

            languages = []
            total_l = sum(
                int(r.get("sessions", 0) or 0) for r in lang_raw.get("rows", [])
            ) or 1
            for r in lang_raw.get("rows", []):
                s = int(r.get("sessions", 0) or 0)
                languages.append(
                    {
                        "language": r.get("language", ""),
                        "sessions": s,
                        "share": round(s / total_l * 100, 1),
                    }
                )

            new_vs_returning = []
            for r in nvr_raw.get("rows", []):
                new_vs_returning.append(
                    {
                        "type": r.get("newVsReturning", ""),
                        "users": int(r.get("activeUsers", 0) or 0),
                        "sessions": int(r.get("sessions", 0) or 0),
                        "avgDuration": round(
                            float(r.get("averageSessionDuration", 0) or 0), 2
                        ),
                        "conversions": int(r.get("conversions", 0) or 0),
                    }
                )

            total_users = sum(r["users"] for r in new_vs_returning) or demo["users"]["total"]
            new_users = next(
                (r["users"] for r in new_vs_returning if "new" in r["type"].lower()),
                demo["users"]["new"],
            )
            returning = total_users - new_users

            result = {
                "scope": {"lpId": lp_id, "lpCount": len(lps)},
                "dateRange": {"start": start.isoformat(), "end": end.isoformat()},
                "users": {
                    "total": total_users,
                    "new": new_users,
                    "returning": returning,
                    "newShare": round(
                        new_users / total_users * 100 if total_users else 0.0, 1
                    ),
                },
                "sessions": sum(r["sessions"] for r in new_vs_returning)
                or demo["sessions"],
                "devices": devices or demo["devices"],
                "browsers": browsers or demo["browsers"],
                "operatingSystems": operating_systems or demo["operatingSystems"],
                "languages": languages or demo["languages"],
                "ageGender": demo["ageGender"],  # GA4 ceiling-restricted fields
                "interests": demo["interests"],
                "engagement": demo["engagement"],
                "newVsReturning": new_vs_returning or demo["newVsReturning"],
            }
            return result
        except Exception as exc:
            logger.warning("GA4 audience failed, fallback demo: %s", exc)
    return {
        "scope": {"lpId": lp_id or "all", "lpCount": len(lps)},
        "dateRange": {"start": start.isoformat(), "end": end.isoformat()},
        **demo,
    }


@api.get("/analytics/locations")
async def analytics_locations(
    lp_id: Optional[str] = Query(None),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    lps, urls, ga_filter = await _resolve_scope(lp_id)
    end = _parse_date(end_date or "today")
    start = _parse_date(start_date or (end - timedelta(days=29)).isoformat())
    service = await _get_ga4_service()
    if service and (lp_id and lp_id != "all"):
        try:
            c_raw = service.locations_countries(
                start.isoformat(), end.isoformat(), ga_filter
            )
            ct_raw = service.locations_cities(
                start.isoformat(), end.isoformat(), ga_filter
            )
            countries = []
            for r in c_raw.get("rows", []):
                sessions = int(r.get("sessions", 0) or 0)
                conv = int(r.get("conversions", 0) or 0)
                countries.append(
                    {
                        "country": r.get("country", ""),
                        "countryCode": r.get("countryId", ""),
                        "users": int(r.get("activeUsers", 0) or 0),
                        "sessions": sessions,
                        "conversions": conv,
                        "conversionRate": round(
                            conv / sessions * 100 if sessions else 0.0, 2
                        ),
                        "bounceRate": round(
                            float(r.get("bounceRate", 0) or 0) * 100, 2
                        ),
                        "avgSessionDuration": round(
                            float(r.get("averageSessionDuration", 0) or 0), 2
                        ),
                    }
                )
            cities = []
            for r in ct_raw.get("rows", []):
                cities.append(
                    {
                        "city": r.get("city", ""),
                        "country": r.get("country", ""),
                        "countryCode": "",
                        "users": int(r.get("activeUsers", 0) or 0),
                        "sessions": int(r.get("sessions", 0) or 0),
                    }
                )
            countries.sort(key=lambda r: r["users"], reverse=True)
            cities.sort(key=lambda r: r["sessions"], reverse=True)
            totals = {
                "countries": len(countries),
                "cities": len(cities),
                "sessions": sum(c["sessions"] for c in countries),
                "users": sum(c["users"] for c in countries),
                "conversions": sum(c["conversions"] for c in countries),
            }
            totals["conversionRate"] = round(
                totals["conversions"] / totals["sessions"] * 100
                if totals["sessions"]
                else 0.0,
                2,
            )
            return {
                "scope": {"lpId": lp_id, "lpCount": len(lps)},
                "dateRange": {"start": start.isoformat(), "end": end.isoformat()},
                "totals": totals,
                "countries": countries,
                "cities": cities[:40],
            }
        except Exception as exc:
            logger.warning("GA4 locations failed, fallback demo: %s", exc)
    data = generate_locations(urls, start, end)
    return {
        "scope": {"lpId": lp_id or "all", "lpCount": len(lps)},
        "dateRange": {"start": start.isoformat(), "end": end.isoformat()},
        **data,
    }


# ---------------------------------------------------------------------------
# Mount
# ---------------------------------------------------------------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _seed_demo_pages():
    count = await db.landing_pages.count_documents({})
    if count == 0:
        seeds = [
            {
                "name": "Pricing Page",
                "url": "https://acme.com/pricing",
                "description": "Main pricing landing page with 3 plan tiers.",
                "ga_path_filter": "/pricing",
            },
            {
                "name": "Product Launch — Fall 2025",
                "url": "https://acme.com/launch/fall-2025",
                "description": "Campaign LP driven from paid social + newsletter.",
                "ga_path_filter": "/launch/fall-2025",
            },
            {
                "name": "Free Trial Signup",
                "url": "https://acme.com/trial",
                "description": "Bottom-of-funnel LP for free trial conversions.",
                "ga_path_filter": "/trial",
            },
        ]
        for s in seeds:
            lp = LandingPage(**s)
            doc = lp.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.landing_pages.insert_one(doc)
        logger.info("Seeded %d demo landing pages", len(seeds))


@app.on_event("shutdown")
async def _shutdown():
    mongo_client.close()
