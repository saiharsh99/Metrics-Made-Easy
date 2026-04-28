"""Deterministic demo data for Ad-platform + Organic dashboards.

Each generator is keyed off a stable seed so the numbers feel real and don't
shuffle between page loads.
"""
from __future__ import annotations

import hashlib
import math
import random
from datetime import date, timedelta
from typing import Any, Dict, List


def _seed_from(*parts: str) -> int:
    return int(hashlib.md5("::".join(parts).encode()).hexdigest()[:12], 16)


def _rng(seed: int) -> random.Random:
    return random.Random(seed)


def _daterange(start: date, end: date) -> List[date]:
    days = (end - start).days + 1
    return [start + timedelta(days=i) for i in range(days)]


# ---------------------------------------------------------------------------
# Meta (Facebook / Instagram) Ads
# ---------------------------------------------------------------------------
META_OBJECTIVES = [
    ("Reach", "REACH", "reach"),
    ("Lead form", "LEAD_GENERATION", "leadgen"),
    ("Conversion campaign", "OUTCOME_SALES", "conversions"),
    ("Click-to-WhatsApp", "MESSAGES", "ctwa"),
]


def _meta_campaign_name(rnd: random.Random, objective: str) -> str:
    themes = [
        "Q4 push",
        "Festive 2026",
        "Always-On",
        "Brand awareness",
        "Retarget warm",
        "Look-alike 1%",
        "Cold prospecting",
        "Boost weekly",
        "AOV expansion",
        "Cart recovery",
    ]
    return f"{objective.split()[0]} · {rnd.choice(themes)} {rnd.randint(1, 9)}"


def generate_meta_ads(start: date, end: date) -> Dict[str, Any]:
    rnd = _rng(_seed_from("meta", str(start), str(end)))
    days = _daterange(start, end)
    n_days = max(len(days), 1)
    campaigns: List[Dict[str, Any]] = []
    series_by_obj: Dict[str, List[Dict[str, Any]]] = {
        o[2]: [] for o in META_OBJECTIVES
    }
    for obj_label, obj_api, obj_key in META_OBJECTIVES:
        # 2 to 4 campaigns per objective
        for _ in range(rnd.randint(2, 4)):
            base_imp = rnd.randint(40_000, 380_000)
            ctr = rnd.uniform(0.6, 3.4)
            cpm = rnd.uniform(85.0, 410.0)
            spend = round(base_imp / 1000 * cpm, 2)
            impressions = base_imp
            clicks = int(impressions * ctr / 100)
            reach = int(impressions * rnd.uniform(0.55, 0.82))
            cpc = round(spend / max(clicks, 1), 2)
            if obj_key == "leadgen":
                leads = int(clicks * rnd.uniform(0.04, 0.18))
                cpl = round(spend / max(leads, 1), 2)
                conversions = leads
                cpa = cpl
                roas = 0.0
                revenue = 0.0
            elif obj_key == "conversions":
                conversions = int(clicks * rnd.uniform(0.012, 0.07))
                aov = rnd.uniform(900, 5400)
                revenue = round(conversions * aov, 2)
                cpa = round(spend / max(conversions, 1), 2)
                roas = round(revenue / max(spend, 1), 2)
                leads = 0
                cpl = 0.0
            elif obj_key == "ctwa":
                conversations = int(clicks * rnd.uniform(0.18, 0.44))
                conversions = conversations
                cpa = round(spend / max(conversations, 1), 2)
                leads = int(conversations * rnd.uniform(0.18, 0.36))
                cpl = round(spend / max(leads, 1), 2)
                roas = 0.0
                revenue = 0.0
            else:  # reach
                conversions = 0
                cpa = 0.0
                roas = 0.0
                leads = 0
                cpl = 0.0
                revenue = 0.0
            status = rnd.choices(
                ["ACTIVE", "PAUSED", "COMPLETED"],
                weights=[0.7, 0.18, 0.12],
                k=1,
            )[0]
            campaigns.append(
                {
                    "id": f"meta_{rnd.randint(10**12, 10**13 - 1)}",
                    "name": _meta_campaign_name(rnd, obj_label),
                    "objective": obj_api,
                    "objectiveLabel": obj_label,
                    "objectiveKey": obj_key,
                    "status": status,
                    "spend": spend,
                    "impressions": impressions,
                    "reach": reach,
                    "clicks": clicks,
                    "ctr": round(ctr, 2),
                    "cpm": round(cpm, 2),
                    "cpc": cpc,
                    "leads": leads,
                    "cpl": cpl,
                    "conversions": conversions,
                    "cpa": cpa,
                    "revenue": revenue,
                    "roas": roas,
                }
            )

    # Daily series per objective
    for obj_label, obj_api, obj_key in META_OBJECTIVES:
        obj_campaigns = [c for c in campaigns if c["objectiveKey"] == obj_key]
        for i, d in enumerate(days):
            weekly = 1.0 + 0.18 * math.sin((i / 7.0) * 2 * math.pi)
            noise = rnd.uniform(0.78, 1.22)
            day_spend = sum(c["spend"] for c in obj_campaigns) / n_days * weekly * noise
            day_impr = sum(c["impressions"] for c in obj_campaigns) / n_days * weekly * noise
            day_clicks = sum(c["clicks"] for c in obj_campaigns) / n_days * weekly * noise
            day_conv = sum(c["conversions"] for c in obj_campaigns) / n_days * weekly * noise
            series_by_obj[obj_key].append(
                {
                    "date": d.isoformat(),
                    "spend": round(day_spend, 2),
                    "impressions": int(day_impr),
                    "clicks": int(day_clicks),
                    "conversions": int(day_conv),
                }
            )

    # Totals & per-objective summary
    total_spend = sum(c["spend"] for c in campaigns)
    total_impr = sum(c["impressions"] for c in campaigns)
    total_reach = sum(c["reach"] for c in campaigns)
    total_clicks = sum(c["clicks"] for c in campaigns)
    total_leads = sum(c["leads"] for c in campaigns)
    total_conv = sum(c["conversions"] for c in campaigns)
    total_revenue = sum(c["revenue"] for c in campaigns)
    by_objective = []
    for obj_label, obj_api, obj_key in META_OBJECTIVES:
        ocs = [c for c in campaigns if c["objectiveKey"] == obj_key]
        spend = sum(c["spend"] for c in ocs)
        impr = sum(c["impressions"] for c in ocs)
        clicks = sum(c["clicks"] for c in ocs)
        leads = sum(c["leads"] for c in ocs)
        conv = sum(c["conversions"] for c in ocs)
        revenue = sum(c["revenue"] for c in ocs)
        by_objective.append(
            {
                "key": obj_key,
                "label": obj_label,
                "campaigns": len(ocs),
                "spend": round(spend, 2),
                "impressions": impr,
                "clicks": clicks,
                "ctr": round(clicks / max(impr, 1) * 100, 2),
                "cpc": round(spend / max(clicks, 1), 2),
                "leads": leads,
                "cpl": round(spend / max(leads, 1), 2) if leads else 0.0,
                "conversions": conv,
                "cpa": round(spend / max(conv, 1), 2) if conv else 0.0,
                "revenue": round(revenue, 2),
                "roas": round(revenue / max(spend, 1), 2) if revenue else 0.0,
            }
        )
    return {
        "totals": {
            "spend": round(total_spend, 2),
            "impressions": total_impr,
            "reach": total_reach,
            "clicks": total_clicks,
            "ctr": round(total_clicks / max(total_impr, 1) * 100, 2),
            "cpc": round(total_spend / max(total_clicks, 1), 2),
            "leads": total_leads,
            "cpl": round(total_spend / max(total_leads, 1), 2) if total_leads else 0.0,
            "conversions": total_conv,
            "cpa": round(total_spend / max(total_conv, 1), 2) if total_conv else 0.0,
            "revenue": round(total_revenue, 2),
            "roas": round(total_revenue / max(total_spend, 1), 2)
            if total_revenue
            else 0.0,
        },
        "byObjective": by_objective,
        "campaigns": sorted(campaigns, key=lambda c: c["spend"], reverse=True),
        "trend": series_by_obj,
    }


# ---------------------------------------------------------------------------
# Google Ads
# ---------------------------------------------------------------------------
GOOGLE_TYPES = [
    ("Search", "SEARCH", "search"),
    ("Display", "DISPLAY", "display"),
    ("Demand Gen", "DEMAND_GEN", "demandgen"),
    ("Performance Max", "PERFORMANCE_MAX", "pmax"),
]


def _gads_campaign_name(rnd: random.Random, label: str) -> str:
    themes = [
        "Brand",
        "Generic",
        "Competitor",
        "DSA",
        "Remarketing",
        "Smart Bidding",
        "Lookalike",
        "Brand Lift",
        "Audience signals",
        "Asset group A",
    ]
    return f"{label} · {rnd.choice(themes)} {rnd.randint(1, 7)}"


def generate_google_ads(start: date, end: date) -> Dict[str, Any]:
    rnd = _rng(_seed_from("gads", str(start), str(end)))
    days = _daterange(start, end)
    n_days = max(len(days), 1)
    campaigns: List[Dict[str, Any]] = []
    series_by_type: Dict[str, List[Dict[str, Any]]] = {
        t[2]: [] for t in GOOGLE_TYPES
    }
    for label, api_type, key in GOOGLE_TYPES:
        for _ in range(rnd.randint(2, 4)):
            base_imp = rnd.randint(20_000, 320_000)
            ctr = (
                rnd.uniform(3.5, 8.5)
                if key == "search"
                else rnd.uniform(0.4, 2.4)
                if key in ("display", "demandgen")
                else rnd.uniform(2.4, 6.2)
            )
            cpm = (
                rnd.uniform(120.0, 480.0)
                if key == "search"
                else rnd.uniform(40.0, 160.0)
                if key in ("display", "demandgen")
                else rnd.uniform(95.0, 320.0)
            )
            impressions = base_imp
            clicks = int(impressions * ctr / 100)
            spend = round(impressions / 1000 * cpm, 2)
            cpc = round(spend / max(clicks, 1), 2)
            conv_rate = (
                rnd.uniform(0.045, 0.16)
                if key in ("search", "pmax")
                else rnd.uniform(0.008, 0.04)
            )
            conversions = int(clicks * conv_rate)
            cpa = round(spend / max(conversions, 1), 2)
            aov = rnd.uniform(700, 4800)
            revenue = round(conversions * aov, 2)
            roas = round(revenue / max(spend, 1), 2)
            status = rnd.choices(
                ["ENABLED", "PAUSED", "REMOVED"], weights=[0.74, 0.18, 0.08], k=1
            )[0]
            campaigns.append(
                {
                    "id": f"gads_{rnd.randint(10**11, 10**12 - 1)}",
                    "name": _gads_campaign_name(rnd, label),
                    "type": api_type,
                    "typeLabel": label,
                    "typeKey": key,
                    "status": status,
                    "spend": spend,
                    "impressions": impressions,
                    "clicks": clicks,
                    "ctr": round(ctr, 2),
                    "cpc": cpc,
                    "cpm": round(cpm, 2),
                    "conversions": conversions,
                    "convRate": round(conv_rate * 100, 2),
                    "cpa": cpa,
                    "revenue": revenue,
                    "roas": roas,
                }
            )

    for label, api_type, key in GOOGLE_TYPES:
        ocs = [c for c in campaigns if c["typeKey"] == key]
        for i, d in enumerate(days):
            weekly = 1.0 + 0.16 * math.sin((i / 7.0) * 2 * math.pi)
            noise = rnd.uniform(0.78, 1.22)
            day_spend = sum(c["spend"] for c in ocs) / n_days * weekly * noise
            day_impr = sum(c["impressions"] for c in ocs) / n_days * weekly * noise
            day_clicks = sum(c["clicks"] for c in ocs) / n_days * weekly * noise
            day_conv = sum(c["conversions"] for c in ocs) / n_days * weekly * noise
            series_by_type[key].append(
                {
                    "date": d.isoformat(),
                    "spend": round(day_spend, 2),
                    "impressions": int(day_impr),
                    "clicks": int(day_clicks),
                    "conversions": int(day_conv),
                }
            )

    total_spend = sum(c["spend"] for c in campaigns)
    total_impr = sum(c["impressions"] for c in campaigns)
    total_clicks = sum(c["clicks"] for c in campaigns)
    total_conv = sum(c["conversions"] for c in campaigns)
    total_revenue = sum(c["revenue"] for c in campaigns)
    by_type = []
    for label, api_type, key in GOOGLE_TYPES:
        ocs = [c for c in campaigns if c["typeKey"] == key]
        spend = sum(c["spend"] for c in ocs)
        impr = sum(c["impressions"] for c in ocs)
        clicks = sum(c["clicks"] for c in ocs)
        conv = sum(c["conversions"] for c in ocs)
        revenue = sum(c["revenue"] for c in ocs)
        by_type.append(
            {
                "key": key,
                "label": label,
                "campaigns": len(ocs),
                "spend": round(spend, 2),
                "impressions": impr,
                "clicks": clicks,
                "ctr": round(clicks / max(impr, 1) * 100, 2),
                "cpc": round(spend / max(clicks, 1), 2),
                "conversions": conv,
                "convRate": round(conv / max(clicks, 1) * 100, 2),
                "cpa": round(spend / max(conv, 1), 2) if conv else 0.0,
                "revenue": round(revenue, 2),
                "roas": round(revenue / max(spend, 1), 2) if revenue else 0.0,
            }
        )
    return {
        "totals": {
            "spend": round(total_spend, 2),
            "impressions": total_impr,
            "clicks": total_clicks,
            "ctr": round(total_clicks / max(total_impr, 1) * 100, 2),
            "cpc": round(total_spend / max(total_clicks, 1), 2),
            "conversions": total_conv,
            "convRate": round(total_conv / max(total_clicks, 1) * 100, 2),
            "cpa": round(total_spend / max(total_conv, 1), 2) if total_conv else 0.0,
            "revenue": round(total_revenue, 2),
            "roas": round(total_revenue / max(total_spend, 1), 2)
            if total_revenue
            else 0.0,
        },
        "byType": by_type,
        "campaigns": sorted(campaigns, key=lambda c: c["spend"], reverse=True),
        "trend": series_by_type,
    }


# ---------------------------------------------------------------------------
# Google Search Console
# ---------------------------------------------------------------------------
GSC_QUERIES = [
    "metrics made easy",
    "lp performance dashboard",
    "ga4 clarity unified",
    "conversion analytics tool",
    "rage click analytics",
    "landing page benchmarks",
    "ga4 alternative dashboard",
    "marketing attribution india",
    "saas conversion tracking",
    "ux analytics platform",
    "pricing page analytics",
    "session replay tool",
    "heatmap saas",
    "free clarity alternative",
    "google ads + meta dashboard",
    "growth analytics suite",
    "lp optimization software",
    "lead capture analytics",
    "ctwa analytics",
    "performance marketing tool",
]
GSC_PAGES = [
    "/",
    "/pricing",
    "/features",
    "/blog/landing-page-conversion-rates-2026",
    "/blog/clarity-vs-ga4",
    "/blog/ctwa-best-practices",
    "/blog/meta-vs-google-ads",
    "/integrations/ga4",
    "/integrations/clarity",
    "/integrations/google-search-console",
    "/customers/case-studies/acme",
    "/contact",
]


def generate_search_console(start: date, end: date) -> Dict[str, Any]:
    rnd = _rng(_seed_from("gsc", str(start), str(end)))
    days = _daterange(start, end)
    base_clicks = rnd.randint(180, 1200)
    base_impr = rnd.randint(8_000, 48_000)
    series = []
    total_clicks = 0
    total_impr = 0
    pos_sum = 0.0
    for i, d in enumerate(days):
        weekly = 1.0 + 0.22 * math.sin((i / 7.0) * 2 * math.pi)
        noise = rnd.uniform(0.78, 1.22)
        clicks = max(0, int(base_clicks * weekly * noise / 30))
        impr = max(clicks, int(base_impr * weekly * noise / 30))
        ctr = round(clicks / max(impr, 1) * 100, 2)
        position = round(rnd.uniform(8.0, 28.0), 1)
        total_clicks += clicks
        total_impr += impr
        pos_sum += position
        series.append(
            {
                "date": d.isoformat(),
                "clicks": clicks,
                "impressions": impr,
                "ctr": ctr,
                "position": position,
            }
        )
    avg_pos = round(pos_sum / max(len(days), 1), 1)
    avg_ctr = round(total_clicks / max(total_impr, 1) * 100, 2)
    queries = []
    for q in GSC_QUERIES:
        impr = rnd.randint(40, 6_400)
        ctr = rnd.uniform(0.4, 8.5)
        clicks = max(0, int(impr * ctr / 100))
        position = round(rnd.uniform(2.4, 38.0), 1)
        queries.append(
            {
                "query": q,
                "clicks": clicks,
                "impressions": impr,
                "ctr": round(ctr, 2),
                "position": position,
            }
        )
    queries.sort(key=lambda r: r["clicks"], reverse=True)
    pages = []
    for p in GSC_PAGES:
        impr = rnd.randint(80, 11_000)
        ctr = rnd.uniform(0.5, 7.5)
        clicks = max(0, int(impr * ctr / 100))
        position = round(rnd.uniform(2.0, 32.0), 1)
        pages.append(
            {
                "page": p,
                "clicks": clicks,
                "impressions": impr,
                "ctr": round(ctr, 2),
                "position": position,
            }
        )
    pages.sort(key=lambda r: r["clicks"], reverse=True)
    devices = []
    desktop_share = rnd.uniform(0.32, 0.5)
    mobile_share = rnd.uniform(0.42, 0.6)
    tablet_share = max(0.02, 1.0 - desktop_share - mobile_share)
    for name, share in [
        ("desktop", desktop_share),
        ("mobile", mobile_share),
        ("tablet", tablet_share),
    ]:
        clicks = int(total_clicks * share)
        impr = int(total_impr * share)
        devices.append(
            {
                "device": name,
                "clicks": clicks,
                "impressions": impr,
                "ctr": round(clicks / max(impr, 1) * 100, 2),
                "share": round(share * 100, 1),
            }
        )
    countries = []
    country_pool = [
        ("India", "IN", 0.32),
        ("United States", "US", 0.22),
        ("United Kingdom", "GB", 0.10),
        ("Germany", "DE", 0.06),
        ("Australia", "AU", 0.05),
        ("Canada", "CA", 0.05),
        ("Singapore", "SG", 0.03),
        ("Brazil", "BR", 0.03),
        ("Other", "ZZ", 0.14),
    ]
    for name, code, w in country_pool:
        clicks = int(total_clicks * w * rnd.uniform(0.85, 1.15))
        impr = int(total_impr * w * rnd.uniform(0.85, 1.15))
        countries.append(
            {
                "country": name,
                "countryCode": code,
                "clicks": clicks,
                "impressions": impr,
                "ctr": round(clicks / max(impr, 1) * 100, 2),
                "position": round(rnd.uniform(8.0, 26.0), 1),
            }
        )
    countries.sort(key=lambda r: r["clicks"], reverse=True)
    return {
        "totals": {
            "clicks": total_clicks,
            "impressions": total_impr,
            "ctr": avg_ctr,
            "position": avg_pos,
        },
        "trend": series,
        "queries": queries,
        "pages": pages,
        "devices": devices,
        "countries": countries,
    }
