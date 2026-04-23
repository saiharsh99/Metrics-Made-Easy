"""Backend API tests for new insights endpoints: sources / audience / locations."""
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


@pytest.fixture(scope="session")
def lps(client):
    r = client.get(f"{API}/landing-pages")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    return data


# ----------------------------- Sources -----------------------------
class TestSourcesAggregate:
    def test_sources_aggregate_no_lp(self, client, lps):
        r = client.get(f"{API}/analytics/sources")
        assert r.status_code == 200, r.text
        d = r.json()
        assert set(["scope", "dateRange", "totals", "byChannel", "bySource", "trend"]) <= set(d.keys())
        assert d["scope"]["lpCount"] == len(lps)
        # 8 default channels expected in demo aggregate
        channels = [c["channel"] for c in d["byChannel"]]
        assert len(channels) == 8
        assert len(set(channels)) == 8
        # totals arithmetic consistent
        sum_sessions = sum(r_["sessions"] for r_ in d["bySource"])
        assert d["totals"]["sessions"] == sum_sessions
        # trend has daily points spanning ~30 days
        assert 28 <= len(d["trend"]) <= 31
        # no _id leakage
        assert "_id" not in d
        for row in d["bySource"]:
            assert "_id" not in row
            for k in ("source", "medium", "channel", "sessions", "users", "conversions"):
                assert k in row

    def test_sources_all_alias(self, client, lps):
        r1 = client.get(f"{API}/analytics/sources")
        r2 = client.get(f"{API}/analytics/sources", params={"lp_id": "all"})
        assert r1.status_code == 200 and r2.status_code == 200
        # Deterministic demo data -> totals should match across aliases
        assert r1.json()["totals"]["sessions"] == r2.json()["totals"]["sessions"]
        assert r1.json()["scope"]["lpCount"] == r2.json()["scope"]["lpCount"]

    def test_sources_single_lp(self, client, lps):
        lp = lps[0]
        r = client.get(f"{API}/analytics/sources", params={"lp_id": lp["id"]})
        assert r.status_code == 200
        d = r.json()
        assert d["scope"]["lpCount"] == 1
        assert d["scope"]["lpId"] == lp["id"]

    def test_sources_custom_range(self, client):
        end = date.today()
        start = end - timedelta(days=6)
        r = client.get(
            f"{API}/analytics/sources",
            params={"start_date": start.isoformat(), "end_date": end.isoformat()},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["dateRange"]["start"] == start.isoformat()
        assert d["dateRange"]["end"] == end.isoformat()
        assert len(d["trend"]) == 7

    def test_sources_daysago_format(self, client):
        r = client.get(
            f"{API}/analytics/sources",
            params={"start_date": "6daysAgo", "end_date": "today"},
        )
        assert r.status_code == 200
        assert len(r.json()["trend"]) == 7


# ----------------------------- Audience -----------------------------
class TestAudience:
    def test_audience_shape_all(self, client, lps):
        r = client.get(f"{API}/analytics/audience")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in (
            "users", "sessions", "devices", "browsers", "operatingSystems",
            "languages", "ageGender", "interests", "engagement", "newVsReturning",
        ):
            assert k in d, f"missing {k}"
        u = d["users"]
        assert {"total", "new", "returning", "newShare"} <= set(u.keys())
        assert u["new"] + u["returning"] == u["total"]
        assert d["scope"]["lpCount"] == len(lps)
        # shares on breakdowns
        if d["devices"]:
            assert "share" in d["devices"][0]

    def test_audience_single_lp(self, client, lps):
        lp = lps[0]
        r = client.get(f"{API}/analytics/audience", params={"lp_id": lp["id"]})
        assert r.status_code == 200
        d = r.json()
        assert d["scope"]["lpCount"] == 1
        assert d["users"]["total"] > 0

    def test_audience_invalid_lp(self, client):
        r = client.get(f"{API}/analytics/audience", params={"lp_id": "does-not-exist"})
        assert r.status_code == 404


# ----------------------------- Locations -----------------------------
class TestLocations:
    def test_locations_shape(self, client, lps):
        r = client.get(f"{API}/analytics/locations")
        assert r.status_code == 200, r.text
        d = r.json()
        assert set(["scope", "dateRange", "totals", "countries", "cities"]) <= set(d.keys())
        t = d["totals"]
        for k in ("countries", "cities", "sessions", "users", "conversions", "conversionRate"):
            assert k in t
        # countries sorted by users desc
        users = [c["users"] for c in d["countries"]]
        assert users == sorted(users, reverse=True)
        for c in d["countries"][:3]:
            assert "countryCode" in c
            assert "conversionRate" in c
            assert "bounceRate" in c
        # cities limited to 40
        assert len(d["cities"]) <= 40
        # totals arithmetic
        assert t["countries"] == len(d["countries"])

    def test_locations_single_lp(self, client, lps):
        lp = lps[0]
        r = client.get(f"{API}/analytics/locations", params={"lp_id": lp["id"]})
        assert r.status_code == 200
        assert r.json()["scope"]["lpCount"] == 1

    def test_locations_invalid_lp(self, client):
        r = client.get(f"{API}/analytics/locations", params={"lp_id": "nope"})
        assert r.status_code == 404

    def test_locations_custom_range(self, client):
        end = date.today()
        start = end - timedelta(days=13)
        r = client.get(
            f"{API}/analytics/locations",
            params={"start_date": start.isoformat(), "end_date": end.isoformat()},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["dateRange"]["start"] == start.isoformat()
        assert d["dateRange"]["end"] == end.isoformat()
