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



# ---------------------------------------------------------------------------
# Aggregate demo generators (across one or many landing pages)
# ---------------------------------------------------------------------------
def _scope_key(lp_urls: List[str]) -> str:
    return "|".join(sorted(lp_urls)) if lp_urls else "__all__"


CHANNEL_MIX = [
    ("Organic Search", ["google", "bing", "duckduckgo"], ["organic"]),
    ("Direct", ["(direct)"], ["(none)"]),
    ("Paid Search", ["google", "bing"], ["cpc", "ppc"]),
    ("Paid Social", ["facebook.com", "instagram.com", "linkedin.com", "tiktok.com"], ["cpc", "paid"]),
    ("Organic Social", ["twitter.com", "linkedin.com", "reddit.com", "youtube.com"], ["referral", "social"]),
    ("Email", ["newsletter", "braze", "customer.io"], ["email"]),
    ("Referral", ["producthunt.com", "hackernews", "medium.com"], ["referral"]),
    ("Affiliate", ["partnerstack", "impact.com"], ["affiliate"]),
]


def generate_sources_aggregate(
    lp_urls: List[str], start: date, end: date
) -> Dict[str, Any]:
    rnd = _pseudo_random(_seed_from(_scope_key(lp_urls), "sources", str(start), str(end)))
    days = _daterange(start, end)
    by_channel = []
    rows = []

    total_sessions = 0
    total_users = 0
    total_conversions = 0
    total_bounce = 0.0
    total_duration = 0.0

    for channel_name, sources, mediums in CHANNEL_MIX:
        # Channel-level share
        base_sessions = rnd.randint(2000, 22000) * max(1, len(lp_urls) or 1)
        channel_sessions = 0
        channel_conversions = 0
        channel_users = 0
        for src in sources:
            for med in mediums:
                s = int(base_sessions / len(sources) / len(mediums) * rnd.uniform(0.7, 1.4))
                u = int(s * rnd.uniform(0.75, 0.93))
                new_users = int(u * rnd.uniform(0.35, 0.78))
                conv = int(s * rnd.uniform(0.008, 0.072))
                bounce = round(rnd.uniform(26.0, 68.0), 1)
                dur = round(rnd.uniform(38.0, 220.0), 1)
                rows.append(
                    {
                        "channel": channel_name,
                        "source": src,
                        "medium": med,
                        "sessions": s,
                        "users": u,
                        "newUsers": new_users,
                        "conversions": conv,
                        "conversionRate": round(conv / s * 100 if s else 0.0, 2),
                        "bounceRate": bounce,
                        "avgSessionDuration": dur,
                    }
                )
                channel_sessions += s
                channel_users += u
                channel_conversions += conv
                total_sessions += s
                total_users += u
                total_conversions += conv
                total_bounce += bounce
                total_duration += dur
        by_channel.append(
            {
                "channel": channel_name,
                "sessions": channel_sessions,
                "users": channel_users,
                "conversions": channel_conversions,
                "conversionRate": round(
                    channel_conversions / channel_sessions * 100 if channel_sessions else 0.0,
                    2,
                ),
            }
        )

    # share
    for c in by_channel:
        c["share"] = round(c["sessions"] / total_sessions * 100 if total_sessions else 0.0, 1)

    # trend: per-day per-channel (weekly seasonality + noise)
    trend: List[Dict[str, Any]] = []
    for i, d in enumerate(days):
        point: Dict[str, Any] = {"date": d.isoformat()}
        for c in by_channel:
            base = c["sessions"] / len(days)
            weekly = 1.0 + 0.22 * math.sin((i / 7.0) * 2 * math.pi)
            point[c["channel"]] = max(0, int(base * weekly * rnd.uniform(0.7, 1.3)))
        trend.append(point)

    rows.sort(key=lambda r: r["sessions"], reverse=True)
    by_channel.sort(key=lambda c: c["sessions"], reverse=True)

    n_rows = max(len(rows), 1)
    totals = {
        "sessions": total_sessions,
        "users": total_users,
        "conversions": total_conversions,
        "conversionRate": round(
            total_conversions / total_sessions * 100 if total_sessions else 0.0, 2
        ),
        "bounceRate": round(total_bounce / n_rows, 2),
        "avgSessionDuration": round(total_duration / n_rows, 2),
    }
    return {
        "totals": totals,
        "byChannel": by_channel,
        "bySource": rows,
        "trend": trend,
    }


BROWSERS = [
    ("Chrome", 0.55),
    ("Safari", 0.20),
    ("Edge", 0.08),
    ("Firefox", 0.06),
    ("Samsung Internet", 0.05),
    ("Opera", 0.03),
    ("Other", 0.03),
]
OS_LIST = [
    ("Windows", 0.33),
    ("iOS", 0.28),
    ("Android", 0.24),
    ("macOS", 0.10),
    ("Linux", 0.03),
    ("ChromeOS", 0.02),
]
LANGUAGES = [
    ("en-US", 0.44),
    ("en-GB", 0.12),
    ("de-DE", 0.08),
    ("fr-FR", 0.07),
    ("es-ES", 0.06),
    ("pt-BR", 0.05),
    ("ja-JP", 0.05),
    ("hi-IN", 0.05),
    ("it-IT", 0.04),
    ("nl-NL", 0.04),
]
AGE_BUCKETS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]
AGE_WEIGHTS = [0.14, 0.32, 0.24, 0.16, 0.09, 0.05]
INTERESTS = [
    "Technology Enthusiasts",
    "SaaS / Productivity",
    "Business Decision Makers",
    "Startup Founders",
    "Designers",
    "Developers",
    "Marketers",
    "E-commerce Buyers",
    "Finance Pros",
    "Students",
]


def _weighted_split(total: int, weights: List[float], rnd: random.Random, jitter: float = 0.15):
    raw = []
    for w in weights:
        raw.append(max(0.0, w * (1.0 + rnd.uniform(-jitter, jitter))))
    s = sum(raw) or 1.0
    return [int(total * x / s) for x in raw]


def generate_audience(lp_urls: List[str], start: date, end: date) -> Dict[str, Any]:
    rnd = _pseudo_random(_seed_from(_scope_key(lp_urls), "audience", str(start), str(end)))
    days = max((end - start).days + 1, 1)
    total_users = rnd.randint(8000, 60000) * max(1, len(lp_urls) or 1) * max(1, days // 7 + 1)
    new_users = int(total_users * rnd.uniform(0.48, 0.72))
    returning = total_users - new_users
    total_sessions = int(total_users * rnd.uniform(1.15, 1.65))

    devices_raw = _weighted_split(total_sessions, [0.58, 0.34, 0.08], rnd)
    devices = [
        {"device": n, "sessions": s, "share": round(s / total_sessions * 100, 1)}
        for n, s in zip(["mobile", "desktop", "tablet"], devices_raw)
    ]
    browsers_raw = _weighted_split(total_sessions, [w for _, w in BROWSERS], rnd)
    browsers = [
        {"browser": n, "sessions": s, "share": round(s / total_sessions * 100, 1)}
        for (n, _), s in zip(BROWSERS, browsers_raw)
    ]
    os_raw = _weighted_split(total_sessions, [w for _, w in OS_LIST], rnd)
    operating_systems = [
        {"os": n, "sessions": s, "share": round(s / total_sessions * 100, 1)}
        for (n, _), s in zip(OS_LIST, os_raw)
    ]
    lang_raw = _weighted_split(total_sessions, [w for _, w in LANGUAGES], rnd)
    languages = [
        {"language": n, "sessions": s, "share": round(s / total_sessions * 100, 1)}
        for (n, _), s in zip(LANGUAGES, lang_raw)
    ]
    ages_raw = _weighted_split(total_users, AGE_WEIGHTS, rnd)
    age_gender = []
    for bucket, u in zip(AGE_BUCKETS, ages_raw):
        male = int(u * rnd.uniform(0.44, 0.56))
        age_gender.append(
            {"ageRange": bucket, "male": male, "female": u - male, "total": u}
        )
    interests = []
    for name in INTERESTS:
        u = int(total_users * rnd.uniform(0.04, 0.22))
        interests.append(
            {
                "interest": name,
                "users": u,
                "share": round(u / total_users * 100, 2),
            }
        )
    interests.sort(key=lambda r: r["users"], reverse=True)

    engagement = {
        "avgSessionDuration": round(rnd.uniform(60.0, 220.0), 1),
        "avgPagesPerSession": round(rnd.uniform(1.8, 4.6), 2),
        "engagementRate": round(rnd.uniform(48.0, 78.0), 1),
        "bounceRate": round(rnd.uniform(28.0, 58.0), 1),
    }

    new_vs_returning = [
        {
            "type": "new",
            "users": new_users,
            "sessions": int(total_sessions * rnd.uniform(0.55, 0.7)),
            "avgDuration": round(rnd.uniform(40.0, 150.0), 1),
            "conversionRate": round(rnd.uniform(1.5, 4.2), 2),
        },
        {
            "type": "returning",
            "users": returning,
            "sessions": total_sessions
            - int(total_sessions * rnd.uniform(0.55, 0.7)),
            "avgDuration": round(rnd.uniform(90.0, 260.0), 1),
            "conversionRate": round(rnd.uniform(3.6, 7.8), 2),
        },
    ]

    return {
        "users": {
            "total": total_users,
            "new": new_users,
            "returning": returning,
            "newShare": round(new_users / total_users * 100, 1),
        },
        "sessions": total_sessions,
        "devices": devices,
        "browsers": browsers,
        "operatingSystems": operating_systems,
        "languages": languages,
        "ageGender": age_gender,
        "interests": interests,
        "engagement": engagement,
        "newVsReturning": new_vs_returning,
    }


COUNTRY_TABLE = [
    ("United States", "US", 0.30),
    ("United Kingdom", "GB", 0.09),
    ("Germany", "DE", 0.08),
    ("India", "IN", 0.08),
    ("Canada", "CA", 0.06),
    ("Australia", "AU", 0.05),
    ("France", "FR", 0.05),
    ("Brazil", "BR", 0.04),
    ("Japan", "JP", 0.04),
    ("Netherlands", "NL", 0.03),
    ("Spain", "ES", 0.03),
    ("Italy", "IT", 0.03),
    ("Mexico", "MX", 0.03),
    ("Sweden", "SE", 0.02),
    ("Singapore", "SG", 0.02),
    ("South Korea", "KR", 0.02),
    ("United Arab Emirates", "AE", 0.01),
    ("Poland", "PL", 0.01),
    ("South Africa", "ZA", 0.01),
]

CITY_BY_COUNTRY = {
    "US": ["New York", "San Francisco", "Los Angeles", "Chicago", "Austin", "Seattle"],
    "GB": ["London", "Manchester", "Birmingham", "Edinburgh"],
    "DE": ["Berlin", "Munich", "Hamburg", "Frankfurt"],
    "IN": ["Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune"],
    "CA": ["Toronto", "Vancouver", "Montreal"],
    "AU": ["Sydney", "Melbourne", "Brisbane"],
    "FR": ["Paris", "Lyon", "Marseille"],
    "BR": ["São Paulo", "Rio de Janeiro", "Brasília"],
    "JP": ["Tokyo", "Osaka", "Yokohama"],
    "NL": ["Amsterdam", "Rotterdam"],
    "ES": ["Madrid", "Barcelona"],
    "IT": ["Milan", "Rome"],
    "MX": ["Mexico City", "Guadalajara"],
    "SE": ["Stockholm"],
    "SG": ["Singapore"],
    "KR": ["Seoul"],
    "AE": ["Dubai"],
    "PL": ["Warsaw"],
    "ZA": ["Johannesburg", "Cape Town"],
}


def generate_locations(lp_urls: List[str], start: date, end: date) -> Dict[str, Any]:
    rnd = _pseudo_random(_seed_from(_scope_key(lp_urls), "locations", str(start), str(end)))
    total_sessions = rnd.randint(22000, 180000) * max(1, len(lp_urls) or 1)
    split = _weighted_split(total_sessions, [w for _, _, w in COUNTRY_TABLE], rnd)
    countries = []
    cities: List[Dict[str, Any]] = []
    for (name, code, _), sessions in zip(COUNTRY_TABLE, split):
        users = int(sessions * rnd.uniform(0.78, 0.92))
        conv = int(sessions * rnd.uniform(0.008, 0.072))
        countries.append(
            {
                "country": name,
                "countryCode": code,
                "users": users,
                "sessions": sessions,
                "conversions": conv,
                "conversionRate": round(conv / sessions * 100 if sessions else 0.0, 2),
                "bounceRate": round(rnd.uniform(28.0, 68.0), 1),
                "avgSessionDuration": round(rnd.uniform(40.0, 220.0), 1),
            }
        )
        for city in CITY_BY_COUNTRY.get(code, []):
            city_sessions = int(sessions * rnd.uniform(0.05, 0.25))
            if city_sessions < 10:
                continue
            cities.append(
                {
                    "city": city,
                    "country": name,
                    "countryCode": code,
                    "sessions": city_sessions,
                    "users": int(city_sessions * rnd.uniform(0.76, 0.93)),
                }
            )
    countries.sort(key=lambda r: r["users"], reverse=True)
    cities.sort(key=lambda r: r["sessions"], reverse=True)
    total_users = sum(c["users"] for c in countries)
    total_conv = sum(c["conversions"] for c in countries)
    return {
        "totals": {
            "countries": len([c for c in countries if c["sessions"] > 0]),
            "cities": len(cities),
            "sessions": total_sessions,
            "users": total_users,
            "conversions": total_conv,
            "conversionRate": round(
                total_conv / total_sessions * 100 if total_sessions else 0.0, 2
            ),
        },
        "countries": countries,
        "cities": cities[:40],
    }
