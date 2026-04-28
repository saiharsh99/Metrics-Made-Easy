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


def _split_proportional(
    rnd: random.Random, total: float, n: int, low: float = 0.55, high: float = 1.45
) -> List[float]:
    """Split a numeric `total` into n positive parts that sum to total."""
    if n <= 0:
        return []
    weights = [rnd.uniform(low, high) for _ in range(n)]
    s = sum(weights) or 1.0
    return [total * w / s for w in weights]


def _split_int(rnd: random.Random, total: int, n: int) -> List[int]:
    if n <= 0:
        return []
    parts = _split_proportional(rnd, float(total), n)
    out = [int(p) for p in parts]
    diff = total - sum(out)
    # Distribute rounding remainder to the largest part(s)
    for i in sorted(range(n), key=lambda i: -out[i]):
        if diff == 0:
            break
        step = 1 if diff > 0 else -1
        out[i] = max(0, out[i] + step)
        diff -= step
    return out


def _derive_child_metrics(parent: Dict[str, Any], spend: float, impr: int, clicks: int, conv: int) -> Dict[str, Any]:
    """Given a child's spend/impr/clicks/conv slice, compute the same KPI bag the parent exposes."""
    spend = round(spend, 2)
    p_revenue = parent.get("revenue", 0.0) or 0.0
    p_leads = parent.get("leads", 0) or 0
    p_clicks = parent.get("clicks", 0) or 0
    p_conv = parent.get("conversions", 0) or 0
    revenue = round(
        p_revenue * (conv / p_conv) if p_conv else 0.0, 2
    )
    leads_share = (clicks / p_clicks) if p_clicks else 0.0
    leads = int(p_leads * leads_share)
    return {
        "spend": spend,
        "impressions": impr,
        "clicks": clicks,
        "ctr": round(clicks / max(impr, 1) * 100, 2),
        "cpc": round(spend / max(clicks, 1), 2),
        "cpm": round(spend / max(impr, 1) * 1000, 2),
        "conversions": conv,
        "cpa": round(spend / max(conv, 1), 2) if conv else 0.0,
        "leads": leads,
        "cpl": round(spend / max(leads, 1), 2) if leads else 0.0,
        "revenue": revenue,
        "roas": round(revenue / max(spend, 1), 2) if revenue else 0.0,
        "convRate": round(conv / max(clicks, 1) * 100, 2),
    }


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
    adsets = _meta_adsets(rnd, campaigns)
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
        "adsets": adsets,
        "ads": _meta_ads(rnd, adsets),
        "trend": series_by_obj,
    }


META_ADSET_AUDIENCES = [
    "Lookalike 1% IN",
    "Lookalike 3% APAC",
    "Interest · Marketing leads",
    "Interest · SaaS buyers",
    "Custom · Site visitors 30d",
    "Custom · Cart abandoners",
    "Retarget · Engagers 90d",
    "Broad · 25-34 IN",
    "Broad · 35-44 IN",
    "Detailed · Founders",
    "Lookalike 5% Tier-1 cities",
]
META_AD_FORMATS = [
    "Static · Hero shot",
    "Carousel · 5 frames",
    "Video · 15s testimonial",
    "Video · 30s explainer",
    "Static · Pricing teaser",
    "Reels · UGC creator",
    "Static · Logo wall",
    "Carousel · Feature grid",
    "Video · 6s bumper",
    "Static · CTA push",
]


def _meta_adsets(rnd: random.Random, campaigns: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for c in campaigns:
        n = min(len(META_ADSET_AUDIENCES), rnd.randint(2, 4))
        spends = _split_proportional(rnd, c["spend"], n)
        imprs = _split_int(rnd, c["impressions"], n)
        clicks = _split_int(rnd, c["clicks"], n)
        convs = _split_int(rnd, c.get("conversions", 0), n)
        names = rnd.sample(META_ADSET_AUDIENCES, n)
        for i in range(n):
            child_kpis = _derive_child_metrics(c, spends[i], imprs[i], clicks[i], convs[i])
            out.append(
                {
                    "id": f"adset_{rnd.randint(10**12, 10**13 - 1)}",
                    "campaignId": c["id"],
                    "campaignName": c["name"],
                    "objectiveKey": c["objectiveKey"],
                    "objectiveLabel": c["objectiveLabel"],
                    "name": names[i],
                    "status": rnd.choices(["ACTIVE", "PAUSED"], weights=[0.78, 0.22], k=1)[0],
                    **child_kpis,
                }
            )
    out.sort(key=lambda r: r["spend"], reverse=True)
    return out


def _meta_ads(rnd: random.Random, adsets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for s in adsets:
        n = min(len(META_AD_FORMATS), rnd.randint(1, 3))
        spends = _split_proportional(rnd, s["spend"], n)
        imprs = _split_int(rnd, s["impressions"], n)
        clicks = _split_int(rnd, s["clicks"], n)
        convs = _split_int(rnd, s.get("conversions", 0), n)
        names = rnd.sample(META_AD_FORMATS, n)
        for i in range(n):
            child_kpis = _derive_child_metrics(s, spends[i], imprs[i], clicks[i], convs[i])
            out.append(
                {
                    "id": f"ad_{rnd.randint(10**12, 10**13 - 1)}",
                    "adsetId": s["id"],
                    "adsetName": s["name"],
                    "campaignId": s["campaignId"],
                    "campaignName": s["campaignName"],
                    "objectiveKey": s["objectiveKey"],
                    "objectiveLabel": s["objectiveLabel"],
                    "name": names[i],
                    "status": rnd.choices(["ACTIVE", "PAUSED"], weights=[0.82, 0.18], k=1)[0],
                    **child_kpis,
                }
            )
    out.sort(key=lambda r: r["spend"], reverse=True)
    return out


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
    adgroups = _gads_adgroups(rnd, campaigns)
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
        "adGroups": adgroups,
        "ads": _gads_ads(rnd, adgroups),
        "trend": series_by_type,
    }


GADS_ADGROUP_THEMES = {
    "search": [
        "Brand · Exact",
        "Brand · Phrase",
        "Generic · High-intent",
        "Competitor · Brand",
        "DSA · Site-wide",
        "Long-tail queries",
    ],
    "display": [
        "In-market · SaaS",
        "Affinity · Marketers",
        "Custom intent · GA4",
        "Remarketing · 30d",
    ],
    "demandgen": [
        "YouTube · Discovery",
        "Discover feed · Lookalike",
        "Gmail promos",
    ],
    "pmax": [
        "Asset group · Pricing",
        "Asset group · Free trial",
        "Asset group · Demo",
        "Asset group · Customer stories",
    ],
}
GADS_AD_FORMATS = {
    "search": ["RSA · 15 headlines", "RSA · Brand-led", "RSA · Offer-led"],
    "display": ["Image 1200x628", "HTML5 banner pack", "Native responsive"],
    "demandgen": ["Video 15s · Explainer", "Image carousel", "Static · Hero"],
    "pmax": ["Asset group v1", "Asset group v2", "Asset group v3"],
}


def _gads_adgroups(rnd: random.Random, campaigns: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for c in campaigns:
        pool = GADS_ADGROUP_THEMES.get(c["typeKey"], ["Default"])
        n = min(len(pool), rnd.randint(2, 3))
        spends = _split_proportional(rnd, c["spend"], n)
        imprs = _split_int(rnd, c["impressions"], n)
        clicks = _split_int(rnd, c["clicks"], n)
        convs = _split_int(rnd, c.get("conversions", 0), n)
        names = rnd.sample(pool, n)
        for i in range(n):
            child_kpis = _derive_child_metrics(c, spends[i], imprs[i], clicks[i], convs[i])
            out.append(
                {
                    "id": f"adgroup_{rnd.randint(10**11, 10**12 - 1)}",
                    "campaignId": c["id"],
                    "campaignName": c["name"],
                    "typeKey": c["typeKey"],
                    "typeLabel": c["typeLabel"],
                    "name": names[i],
                    "status": rnd.choices(
                        ["ENABLED", "PAUSED"], weights=[0.8, 0.2], k=1
                    )[0],
                    **child_kpis,
                }
            )
    out.sort(key=lambda r: r["spend"], reverse=True)
    return out


def _gads_ads(rnd: random.Random, adgroups: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for g in adgroups:
        pool = GADS_AD_FORMATS.get(g["typeKey"], ["Default ad"])
        n = min(len(pool), rnd.randint(1, 3))
        spends = _split_proportional(rnd, g["spend"], n)
        imprs = _split_int(rnd, g["impressions"], n)
        clicks = _split_int(rnd, g["clicks"], n)
        convs = _split_int(rnd, g.get("conversions", 0), n)
        names = rnd.sample(pool, n)
        for i in range(n):
            child_kpis = _derive_child_metrics(g, spends[i], imprs[i], clicks[i], convs[i])
            out.append(
                {
                    "id": f"gad_{rnd.randint(10**11, 10**12 - 1)}",
                    "adGroupId": g["id"],
                    "adGroupName": g["name"],
                    "campaignId": g["campaignId"],
                    "campaignName": g["campaignName"],
                    "typeKey": g["typeKey"],
                    "typeLabel": g["typeLabel"],
                    "name": names[i],
                    "status": rnd.choices(
                        ["ENABLED", "PAUSED"], weights=[0.82, 0.18], k=1
                    )[0],
                    **child_kpis,
                }
            )
    out.sort(key=lambda r: r["spend"], reverse=True)
    return out


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


# ---------------------------------------------------------------------------
# CRM (demo)
# ---------------------------------------------------------------------------
CRM_STAGES = [
    ("New", "new", "#0ea5e9"),
    ("Qualified", "qualified", "#2563eb"),
    ("Proposal", "proposal", "#7c3aed"),
    ("Negotiation", "negotiation", "#db2777"),
    ("Closed-Won", "won", "#16a34a"),
    ("Closed-Lost", "lost", "#71717a"),
]
CRM_SOURCES = [
    "Meta Ads",
    "Google Ads",
    "Google Organic",
    "Direct",
    "Referral",
    "Email",
    "LinkedIn",
]
CRM_OWNERS = [
    "Aanya M.",
    "Vikram S.",
    "Riya K.",
    "Arjun P.",
    "Neha B.",
    "Karthik R.",
]
CRM_COMPANIES = [
    "Northwind",
    "Globex",
    "Initech",
    "Umbrella",
    "Soylent",
    "Acme",
    "Hooli",
    "Pied Piper",
    "Stark Industries",
    "Wayne Ent.",
    "Wonka",
    "Cyberdyne",
    "Tyrell Corp",
    "Massive Dynamic",
]


def generate_crm(start: date, end: date) -> Dict[str, Any]:
    rnd = _rng(_seed_from("crm", str(start), str(end)))
    days = _daterange(start, end)
    n_days = max(len(days), 1)

    # Pipeline by stage
    by_stage = []
    total_pipeline = 0.0
    total_count = 0
    for label, key, color in CRM_STAGES:
        count = rnd.randint(8, 60) if key not in ("won", "lost") else rnd.randint(4, 24)
        avg_value = rnd.uniform(45_000, 320_000)
        value = round(count * avg_value, 2)
        total_count += count
        if key not in ("lost",):
            total_pipeline += value
        by_stage.append(
            {
                "key": key,
                "label": label,
                "count": count,
                "value": value,
                "color": color,
            }
        )

    # Lead-source attribution
    by_source = []
    src_total_leads = 0
    for s in CRM_SOURCES:
        leads = rnd.randint(40, 380)
        deals = int(leads * rnd.uniform(0.06, 0.22))
        won = int(deals * rnd.uniform(0.18, 0.42))
        revenue = round(won * rnd.uniform(60_000, 280_000), 2)
        src_total_leads += leads
        by_source.append(
            {
                "source": s,
                "leads": leads,
                "deals": deals,
                "won": won,
                "revenue": revenue,
                "winRate": round(won / max(deals, 1) * 100, 1),
            }
        )
    by_source.sort(key=lambda r: r["revenue"], reverse=True)

    # Daily new-leads + revenue trend
    trend = []
    base_leads = rnd.randint(40, 140)
    base_rev = rnd.uniform(180_000, 640_000)
    for i, d in enumerate(days):
        weekly = 1.0 + 0.20 * math.sin((i / 7.0) * 2 * math.pi)
        noise = rnd.uniform(0.78, 1.22)
        leads = max(0, int(base_leads * weekly * noise / 7))
        revenue = round(base_rev * weekly * noise / 30, 2)
        trend.append(
            {
                "date": d.isoformat(),
                "leads": leads,
                "revenue": revenue,
            }
        )

    # Recent deals
    deals = []
    for _ in range(18):
        stage = rnd.choices(
            CRM_STAGES, weights=[3, 4, 3, 2, 2, 1.2], k=1
        )[0]
        owner = rnd.choice(CRM_OWNERS)
        company = rnd.choice(CRM_COMPANIES)
        source = rnd.choice(CRM_SOURCES)
        value = round(rnd.uniform(38_000, 480_000), 2)
        age_days = rnd.randint(1, 42)
        deals.append(
            {
                "id": f"deal_{rnd.randint(10**6, 10**7 - 1)}",
                "name": f"{company} · {rnd.choice(['Annual', 'Pilot', 'Expansion', 'Renewal', 'Net new'])}",
                "company": company,
                "owner": owner,
                "source": source,
                "stage": stage[0],
                "stageKey": stage[1],
                "value": value,
                "ageDays": age_days,
                "probability": rnd.choice([10, 25, 40, 60, 75, 90])
                if stage[1] not in ("won", "lost")
                else (100 if stage[1] == "won" else 0),
            }
        )
    deals.sort(key=lambda r: r["value"], reverse=True)

    won_deals = [d for d in deals if d["stageKey"] == "won"]
    lost_deals = [d for d in deals if d["stageKey"] == "lost"]
    won_value = sum(d["value"] for d in won_deals)
    win_rate = round(
        len(won_deals) / max(len(won_deals) + len(lost_deals), 1) * 100, 1
    )
    avg_deal_size = round(
        sum(d["value"] for d in deals) / max(len(deals), 1), 2
    )
    sales_cycle = round(rnd.uniform(18.0, 42.0), 1)

    return {
        "totals": {
            "leads": src_total_leads,
            "openDeals": total_count
            - sum(s["count"] for s in by_stage if s["key"] in ("won", "lost")),
            "pipeline": round(total_pipeline, 2),
            "wonRevenue": round(won_value, 2),
            "winRate": win_rate,
            "avgDealSize": avg_deal_size,
            "salesCycleDays": sales_cycle,
        },
        "byStage": by_stage,
        "bySource": by_source,
        "trend": trend,
        "deals": deals,
    }

