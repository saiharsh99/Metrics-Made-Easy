"""Deterministic demo data generator for GA4 and Clarity metrics.

Used when credentials are not configured so the dashboard is still
useful out-of-the-box. Data varies per landing page URL and date range
to feel real.
"""
from __future__ import annotations

import hashlib
import math
import random
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List


def _seed_from(*parts: str) -> int:
    key = "::".join(parts)
    return int(hashlib.md5(key.encode()).hexdigest()[:12], 16)


def _daterange(start: date, end: date) -> List[date]:
    days = (end - start).days + 1
    return [start + timedelta(days=i) for i in range(days)]


def _pseudo_random(seed: int) -> random.Random:
    return random.Random(seed)


def generate_ga4_timeseries(
    lp_url: str, start: date, end: date
) -> Dict[str, Any]:
    rnd = _pseudo_random(_seed_from(lp_url, "ga4", str(start), str(end)))
    series = []
    total_sessions = 0
    total_users = 0
    total_pv = 0
    total_conv = 0
    bounce_sum = 0.0
    dur_sum = 0.0
    days = _daterange(start, end)
    base = rnd.randint(600, 4200)
    for i, d in enumerate(days):
        # weekly seasonality
        weekly = 1.0 + 0.18 * math.sin((i / 7.0) * 2 * math.pi)
        noise = rnd.uniform(0.75, 1.25)
        sessions = int(base * weekly * noise)
        users = int(sessions * rnd.uniform(0.78, 0.94))
        pageviews = int(sessions * rnd.uniform(1.6, 3.4))
        conversions = int(sessions * rnd.uniform(0.012, 0.058))
        bounce = round(rnd.uniform(28.0, 62.0), 1)
        avg_dur = round(rnd.uniform(45.0, 240.0), 1)
        total_sessions += sessions
        total_users += users
        total_pv += pageviews
        total_conv += conversions
        bounce_sum += bounce
        dur_sum += avg_dur
        series.append(
            {
                "date": d.isoformat(),
                "sessions": sessions,
                "users": users,
                "pageviews": pageviews,
                "conversions": conversions,
                "bounceRate": bounce,
                "avgSessionDuration": avg_dur,
            }
        )
    n = max(len(days), 1)
    summary = {
        "sessions": total_sessions,
        "users": total_users,
        "pageviews": total_pv,
        "conversions": total_conv,
        "bounceRate": round(bounce_sum / n, 2),
        "avgSessionDuration": round(dur_sum / n, 2),
        "conversionRate": round(
            (total_conv / total_sessions * 100) if total_sessions else 0.0, 2
        ),
    }
    return {"series": series, "summary": summary}


def generate_traffic_sources(lp_url: str, seed_extra: str = "") -> List[Dict[str, Any]]:
    rnd = _pseudo_random(_seed_from(lp_url, "sources", seed_extra))
    sources = [
        ("google", "organic"),
        ("(direct)", "(none)"),
        ("facebook.com", "referral"),
        ("newsletter", "email"),
        ("google", "cpc"),
        ("twitter.com", "referral"),
        ("linkedin.com", "referral"),
        ("bing", "organic"),
    ]
    data = []
    for src, med in sources:
        sessions = rnd.randint(120, 5200)
        data.append(
            {
                "source": src,
                "medium": med,
                "sessions": sessions,
                "bounceRate": round(rnd.uniform(25.0, 68.0), 1),
                "conversions": int(sessions * rnd.uniform(0.005, 0.06)),
            }
        )
    data.sort(key=lambda r: r["sessions"], reverse=True)
    return data


def generate_device_breakdown(lp_url: str) -> List[Dict[str, Any]]:
    rnd = _pseudo_random(_seed_from(lp_url, "device"))
    mobile = rnd.uniform(0.48, 0.68)
    desktop = rnd.uniform(0.24, 0.42)
    # normalise
    tablet = max(0.02, 1.0 - mobile - desktop)
    total_sessions = rnd.randint(8000, 45000)
    return [
        {
            "device": "mobile",
            "sessions": int(total_sessions * mobile),
            "share": round(mobile * 100, 1),
        },
        {
            "device": "desktop",
            "sessions": int(total_sessions * desktop),
            "share": round(desktop * 100, 1),
        },
        {
            "device": "tablet",
            "sessions": int(total_sessions * tablet),
            "share": round(tablet * 100, 1),
        },
    ]


def generate_country_breakdown(lp_url: str) -> List[Dict[str, Any]]:
    rnd = _pseudo_random(_seed_from(lp_url, "country"))
    countries = [
        "United States",
        "United Kingdom",
        "Germany",
        "India",
        "Canada",
        "Australia",
        "France",
        "Brazil",
        "Japan",
        "Netherlands",
    ]
    data = []
    for c in countries:
        data.append(
            {
                "country": c,
                "users": rnd.randint(200, 9500),
                "sessions": rnd.randint(220, 12000),
            }
        )
    data.sort(key=lambda r: r["users"], reverse=True)
    return data


def generate_realtime(lp_url: str) -> Dict[str, Any]:
    # vary with current minute so UI refreshes feel alive
    now_bucket = datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
    rnd = _pseudo_random(_seed_from(lp_url, "realtime", now_bucket))
    active = rnd.randint(12, 380)
    by_country = []
    for c in ["United States", "India", "Germany", "United Kingdom", "Brazil"]:
        by_country.append(
            {"country": c, "activeUsers": max(1, int(active * rnd.uniform(0.05, 0.35)))}
        )
    by_country.sort(key=lambda r: r["activeUsers"], reverse=True)
    per_min = []
    for i in range(30, -1, -1):
        per_min.append(
            {"minutesAgo": i, "activeUsers": max(0, int(active * rnd.uniform(0.6, 1.3)))}
        )
    return {"activeUsers": active, "byCountry": by_country, "perMinute": per_min}


def generate_clarity(lp_url: str, days: int) -> Dict[str, Any]:
    rnd = _pseudo_random(_seed_from(lp_url, "clarity", str(days)))
    sessions = rnd.randint(2200, 18000) * max(1, days)
    rage = int(sessions * rnd.uniform(0.018, 0.062))
    dead = int(sessions * rnd.uniform(0.028, 0.085))
    quick_back = int(sessions * rnd.uniform(0.02, 0.09))
    excessive_scroll = int(sessions * rnd.uniform(0.015, 0.07))
    summary = {
        "sessions": sessions,
        "rageClicks": rage,
        "deadClicks": dead,
        "quickBacks": quick_back,
        "excessiveScroll": excessive_scroll,
        "avgScrollDepth": round(rnd.uniform(42.0, 78.0), 1),
        "avgEngagementTime": round(rnd.uniform(25.0, 120.0), 1),
    }
    hotspots = []
    selectors = [
        "#pricing-cta",
        ".nav__signup",
        "button[data-testid='hero-cta']",
        ".faq__toggle",
        "#newsletter-submit",
        "img.hero__illustration",
        ".footer__link--contact",
    ]
    for sel in selectors:
        hotspots.append(
            {
                "selector": sel,
                "rageClicks": rnd.randint(4, max(5, rage // 6)),
                "deadClicks": rnd.randint(2, max(3, dead // 6)),
            }
        )
    hotspots.sort(key=lambda r: r["rageClicks"] + r["deadClicks"], reverse=True)
    # session recordings preview
    recordings = []
    countries = ["US", "UK", "DE", "IN", "CA", "AU", "BR", "FR"]
    browsers = ["Chrome", "Safari", "Firefox", "Edge"]
    devices = ["mobile", "desktop", "tablet"]
    for i in range(8):
        recordings.append(
            {
                "id": f"rec_{rnd.randint(100000, 999999)}",
                "country": rnd.choice(countries),
                "browser": rnd.choice(browsers),
                "device": rnd.choice(devices),
                "duration": rnd.randint(18, 780),
                "pages": rnd.randint(1, 9),
                "hasRage": rnd.random() < 0.45,
                "hasDead": rnd.random() < 0.35,
                "timestamp": (
                    datetime.now(timezone.utc) - timedelta(minutes=rnd.randint(5, 2880))
                ).isoformat(),
            }
        )
    return {"summary": summary, "hotspots": hotspots, "recordings": recordings}
