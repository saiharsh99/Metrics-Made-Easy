"""Backend API tests for the 4 new marketing demo dashboards
(Meta Ads, Google Ads, Search Console, CRM)."""
import os
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.strip().split("=", 1)[1]
                break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Meta Ads ----------
class TestMetaAds:
    EXPECTED_OBJECTIVES = {"reach", "leadgen", "conversions", "ctwa"}

    def test_default(self, client):
        r = client.get(f"{API}/analytics/ads/meta")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mode"] == "demo"
        assert "dateRange" in d
        assert "totals" in d and "byObjective" in d and "campaigns" in d and "trend" in d
        # totals sanity
        for k in ["spend", "impressions", "clicks", "ctr", "cpc"]:
            assert k in d["totals"], f"missing totals.{k}"
        # byObjective
        assert isinstance(d["byObjective"], list) and len(d["byObjective"]) == 4
        keys = {row.get("key") or row.get("objective") for row in d["byObjective"]}
        assert keys == self.EXPECTED_OBJECTIVES, keys
        # campaigns
        assert isinstance(d["campaigns"], list) and len(d["campaigns"]) > 0
        camp0 = d["campaigns"][0]
        assert "name" in camp0 and ("objective" in camp0 or "type" in camp0)
        # trend dict with same 4 keys
        assert isinstance(d["trend"], dict)
        assert set(d["trend"].keys()) == self.EXPECTED_OBJECTIVES, d["trend"].keys()

    def test_with_range(self, client):
        end = date.today()
        start = end - timedelta(days=6)
        r = client.get(
            f"{API}/analytics/ads/meta",
            params={"start_date": start.isoformat(), "end_date": end.isoformat()},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["dateRange"]["start"] == start.isoformat()
        assert d["dateRange"]["end"] == end.isoformat()
        # trend lengths should match 7 days
        for key, series in d["trend"].items():
            assert isinstance(series, list)
            assert len(series) == 7, f"trend[{key}] len={len(series)}"


# ---------- Google Ads ----------
class TestGoogleAds:
    EXPECTED_TYPES = {"search", "display", "demandgen", "pmax"}

    def test_default(self, client):
        r = client.get(f"{API}/analytics/ads/google")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mode"] == "demo"
        assert "totals" in d and "byType" in d and "campaigns" in d and "trend" in d
        for k in ["spend", "impressions", "clicks"]:
            assert k in d["totals"]
        assert isinstance(d["byType"], list) and len(d["byType"]) == 4
        keys = {row.get("key") or row.get("type") for row in d["byType"]}
        assert keys == self.EXPECTED_TYPES, keys
        assert isinstance(d["campaigns"], list) and len(d["campaigns"]) > 0
        assert isinstance(d["trend"], dict)
        assert set(d["trend"].keys()) == self.EXPECTED_TYPES

    def test_with_range(self, client):
        end = date.today()
        start = end - timedelta(days=13)
        r = client.get(
            f"{API}/analytics/ads/google",
            params={"start_date": start.isoformat(), "end_date": end.isoformat()},
        )
        assert r.status_code == 200
        d = r.json()
        for key, series in d["trend"].items():
            assert len(series) == 14, f"trend[{key}] len={len(series)}"


# ---------- Hierarchy: Meta + Google adsets/adgroups + ads ----------
class TestMetaHierarchy:
    """Iteration 4: campaign → adset → ad drill-down structure."""

    def test_meta_adsets_and_ads_shape(self, client):
        r = client.get(f"{API}/analytics/ads/meta")
        assert r.status_code == 200
        d = r.json()
        # New top-level keys
        assert "adsets" in d, "missing adsets[]"
        assert "ads" in d, "missing ads[]"
        adsets, ads = d["adsets"], d["ads"]
        assert isinstance(adsets, list) and len(adsets) > 0
        assert isinstance(ads, list) and len(ads) > 0

        camp_ids = {c["id"] for c in d["campaigns"]}
        adset_ids = {a["id"] for a in adsets}

        # Each adset must reference a real campaign and have KPI fields
        required = {"campaignId", "campaignName", "objectiveKey", "name", "status",
                    "spend", "impressions", "clicks", "ctr", "cpc",
                    "conversions", "leads", "cpa", "roas"}
        for a in adsets:
            missing = required - set(a.keys())
            assert not missing, f"adset missing {missing}: {a}"
            assert a["campaignId"] in camp_ids, f"adset references unknown campaign {a['campaignId']}"

        # Each ad must reference a real adset + campaign
        required_ad = {"adsetId", "adsetName", "campaignId", "campaignName", "objectiveKey",
                       "spend", "impressions", "clicks", "ctr", "cpc", "conversions"}
        for ad in ads:
            missing = required_ad - set(ad.keys())
            assert not missing, f"ad missing {missing}: {ad}"
            assert ad["campaignId"] in camp_ids
            assert ad["adsetId"] in adset_ids, f"ad references unknown adset {ad['adsetId']}"

    def test_meta_child_sums_match_parent(self, client):
        """Sum of adset KPIs per campaign ≈ campaign KPIs (within tolerance)."""
        d = client.get(f"{API}/analytics/ads/meta").json()
        adsets_by_camp = {}
        for a in d["adsets"]:
            adsets_by_camp.setdefault(a["campaignId"], []).append(a)
        for c in d["campaigns"]:
            kids = adsets_by_camp.get(c["id"], [])
            assert kids, f"campaign {c['id']} has no adsets"
            sum_spend = sum(k["spend"] for k in kids)
            sum_impr = sum(k["impressions"] for k in kids)
            sum_clicks = sum(k["clicks"] for k in kids)
            sum_conv = sum(k["conversions"] for k in kids)
            assert abs(sum_spend - c["spend"]) <= 0.05, f"spend mismatch {c['id']}: {sum_spend} vs {c['spend']}"
            assert abs(sum_impr - c["impressions"]) <= 2, f"impr mismatch {c['id']}"
            assert abs(sum_clicks - c["clicks"]) <= 2, f"clicks mismatch {c['id']}"
            assert abs(sum_conv - c["conversions"]) <= 2, f"conv mismatch {c['id']}"


class TestGoogleHierarchy:
    def test_google_adgroups_and_ads_shape(self, client):
        r = client.get(f"{API}/analytics/ads/google")
        assert r.status_code == 200
        d = r.json()
        assert "adGroups" in d, "missing adGroups[]"
        assert "ads" in d, "missing ads[]"
        adgroups, ads = d["adGroups"], d["ads"]
        assert isinstance(adgroups, list) and len(adgroups) > 0
        assert isinstance(ads, list) and len(ads) > 0

        camp_ids = {c["id"] for c in d["campaigns"]}
        adgroup_ids = {g["id"] for g in adgroups}

        required = {"campaignId", "typeKey", "name",
                    "spend", "impressions", "clicks", "ctr", "cpc", "conversions"}
        for g in adgroups:
            missing = required - set(g.keys())
            assert not missing, f"adgroup missing {missing}: {g}"
            assert g["campaignId"] in camp_ids

        required_ad = {"adGroupId", "adGroupName", "campaignId", "typeKey",
                       "spend", "impressions", "clicks"}
        for ad in ads:
            missing = required_ad - set(ad.keys())
            assert not missing, f"ad missing {missing}: {ad}"
            assert ad["adGroupId"] in adgroup_ids
            assert ad["campaignId"] in camp_ids

    def test_google_child_sums_match_parent(self, client):
        d = client.get(f"{API}/analytics/ads/google").json()
        groups_by_camp = {}
        for g in d["adGroups"]:
            groups_by_camp.setdefault(g["campaignId"], []).append(g)
        for c in d["campaigns"]:
            kids = groups_by_camp.get(c["id"], [])
            assert kids, f"campaign {c['id']} has no ad groups"
            sum_spend = sum(k["spend"] for k in kids)
            sum_impr = sum(k["impressions"] for k in kids)
            sum_clicks = sum(k["clicks"] for k in kids)
            sum_conv = sum(k["conversions"] for k in kids)
            assert abs(sum_spend - c["spend"]) <= 0.05, f"spend mismatch {c['id']}: {sum_spend} vs {c['spend']}"
            assert abs(sum_impr - c["impressions"]) <= 2
            assert abs(sum_clicks - c["clicks"]) <= 2
            assert abs(sum_conv - c["conversions"]) <= 2


# ---------- Search Console ----------
class TestSearchConsole:
    def test_default(self, client):
        r = client.get(f"{API}/analytics/organic/search-console")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mode"] == "demo"
        for k in ["totals", "trend", "queries", "pages", "devices", "countries"]:
            assert k in d, f"missing top-level {k}"
        for k in ["clicks", "impressions", "ctr", "position"]:
            assert k in d["totals"], f"totals missing {k}"
        for arr_key in ["queries", "pages", "devices", "countries"]:
            assert isinstance(d[arr_key], list) and len(d[arr_key]) > 0, arr_key
        # trend should be a list or dict of series
        assert d["trend"] is not None

    def test_with_range(self, client):
        end = date.today()
        start = end - timedelta(days=6)
        r = client.get(
            f"{API}/analytics/organic/search-console",
            params={"start_date": start.isoformat(), "end_date": end.isoformat()},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["dateRange"]["start"] == start.isoformat()


# ---------- CRM ----------
class TestCRM:
    def test_default(self, client):
        r = client.get(f"{API}/analytics/crm")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["mode"] == "demo"
        for k in ["totals", "byStage", "bySource", "trend", "deals"]:
            assert k in d, f"missing {k}"
        for k in [
            "leads", "openDeals", "pipeline", "wonRevenue",
            "winRate", "avgDealSize", "salesCycleDays",
        ]:
            assert k in d["totals"], f"totals missing {k}"
        # byStage 6 entries
        assert isinstance(d["byStage"], list)
        assert len(d["byStage"]) == 6, f"expected 6 stages, got {len(d['byStage'])}"
        assert isinstance(d["bySource"], list) and len(d["bySource"]) > 0
        assert isinstance(d["deals"], list) and len(d["deals"]) > 0

    def test_with_range(self, client):
        end = date.today()
        start = end - timedelta(days=29)
        r = client.get(
            f"{API}/analytics/crm",
            params={"start_date": start.isoformat(), "end_date": end.isoformat()},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["dateRange"]["start"] == start.isoformat()


# ---------- Regression: existing endpoints still up ----------
class TestRegression:
    @pytest.mark.parametrize(
        "path",
        [
            "/landing-pages",
            "/credentials/status",
            "/analytics/summary",
        ],
    )
    def test_unscoped(self, client, path):
        r = client.get(f"{API}{path}")
        assert r.status_code == 200, f"{path} -> {r.status_code}: {r.text[:200]}"

    def test_scoped_endpoints(self, client):
        lps = client.get(f"{API}/landing-pages").json()
        assert lps
        lp_id = lps[0]["id"]
        for path in [
            "/analytics/sources",
            "/analytics/audience",
            "/analytics/locations",
            "/analytics/clarity",
        ]:
            r = client.get(f"{API}{path}", params={"lp_id": lp_id})
            assert r.status_code == 200, f"{path} -> {r.status_code}"

    def test_compare_endpoint(self, client):
        lps = client.get(f"{API}/landing-pages").json()
        lp_id = lps[0]["id"]
        today = date.today()
        a_end = today
        a_start = today - timedelta(days=6)
        b_end = a_start - timedelta(days=1)
        b_start = b_end - timedelta(days=6)
        r = client.get(
            f"{API}/analytics/compare",
            params={
                "lp_id": lp_id,
                "period_a_start": a_start.isoformat(),
                "period_a_end": a_end.isoformat(),
                "period_b_start": b_start.isoformat(),
                "period_b_end": b_end.isoformat(),
            },
        )
        assert r.status_code == 200
