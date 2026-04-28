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
