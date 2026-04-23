"""Backend API tests for Unified GA4 + Clarity analytics dashboard (DEMO mode)."""
import os
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # fallback to frontend/.env
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


# ---------- Health ----------
class TestHealth:
    def test_root(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data["service"] == "unified-lp-analytics"
        assert "version" in data


# ---------- Credentials ----------
class TestCredentials:
    def test_status_demo_mode(self, client):
        r = client.get(f"{API}/credentials/status")
        assert r.status_code == 200
        d = r.json()
        assert "ga4_connected" in d
        assert "clarity_connected" in d
        assert "demo_mode" in d
        assert isinstance(d["demo_mode"], bool)

    def test_save_ga4_missing_fields(self, client):
        r = client.post(f"{API}/credentials", json={"provider": "ga4"})
        assert r.status_code == 400

    def test_save_clarity_missing_token(self, client):
        r = client.post(f"{API}/credentials", json={"provider": "clarity"})
        assert r.status_code == 400

    def test_delete_ga4_clarity(self, client):
        # cleanup any prior saved creds
        r1 = client.delete(f"{API}/credentials/ga4")
        r2 = client.delete(f"{API}/credentials/clarity")
        assert r1.status_code == 200
        assert r2.status_code == 200
        st = client.get(f"{API}/credentials/status").json()
        assert st["ga4_connected"] is False
        assert st["clarity_connected"] is False


# ---------- Landing pages CRUD ----------
class TestLandingPages:
    def test_list_seeded(self, client):
        r = client.get(f"{API}/landing-pages")
        assert r.status_code == 200
        lps = r.json()
        assert isinstance(lps, list)
        assert len(lps) >= 3
        names = [lp["name"] for lp in lps]
        assert any("Pricing" in n for n in names)
        assert any("Launch" in n or "Product" in n for n in names)
        assert any("Trial" in n for n in names)
        # ensure no _id leakage
        for lp in lps:
            assert "_id" not in lp
            assert "id" in lp and "url" in lp

    def test_create_get_update_delete(self, client):
        unique = f"TEST_LP_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": unique,
            "url": "https://acme.com/test-campaign",
            "description": "created by tests",
            "ga_path_filter": "/test-campaign",
        }
        c = client.post(f"{API}/landing-pages", json=payload)
        assert c.status_code == 200, c.text
        created = c.json()
        assert created["name"] == unique
        assert "_id" not in created
        lp_id = created["id"]

        # GET
        g = client.get(f"{API}/landing-pages/{lp_id}")
        assert g.status_code == 200
        assert g.json()["name"] == unique

        # GET 404
        g404 = client.get(f"{API}/landing-pages/does-not-exist-xyz")
        assert g404.status_code == 404

        # PATCH
        p = client.patch(
            f"{API}/landing-pages/{lp_id}",
            json={"description": "updated desc"},
        )
        assert p.status_code == 200
        assert p.json()["description"] == "updated desc"
        # persistence
        g2 = client.get(f"{API}/landing-pages/{lp_id}").json()
        assert g2["description"] == "updated desc"

        # DELETE
        d = client.delete(f"{API}/landing-pages/{lp_id}")
        assert d.status_code == 200
        assert d.json()["deleted"] is True
        # confirm removed
        assert client.get(f"{API}/landing-pages/{lp_id}").status_code == 404


@pytest.fixture(scope="session")
def first_lp(client):
    lps = client.get(f"{API}/landing-pages").json()
    assert lps, "no seeded LPs"
    return lps[0]


# ---------- Analytics ----------
class TestAnalytics:
    def test_summary(self, client):
        r = client.get(f"{API}/analytics/summary")
        assert r.status_code == 200
        d = r.json()
        assert "totals" in d and "rows" in d and "dateRange" in d
        assert d["landingPageCount"] >= 3
        for key in ["sessions", "users", "pageviews", "conversions", "rageClicks", "deadClicks", "bounceRate", "conversionRate"]:
            assert key in d["totals"], key
        for row in d["rows"]:
            assert "_id" not in row
            for k in ["id", "name", "sessions", "rageClicks", "deadClicks"]:
                assert k in row

    def test_overview_default_30d(self, client, first_lp):
        r = client.get(f"{API}/analytics/overview", params={"lp_id": first_lp["id"]})
        assert r.status_code == 200
        d = r.json()
        assert len(d["kpis"]) == 8
        keys = [k["key"] for k in d["kpis"]]
        for expected in [
            "sessions", "users", "pageviews", "conversionRate",
            "bounceRate", "rageClicks", "deadClicks", "engagementScore",
        ]:
            assert expected in keys
        assert d["dateRange"]["days"] == 30
        assert len(d["ga4"]["series"]) == 30
        assert "summary" in d["clarity"]

    def test_overview_custom_range(self, client, first_lp):
        end = date.today()
        start = end - timedelta(days=6)
        r = client.get(
            f"{API}/analytics/overview",
            params={
                "lp_id": first_lp["id"],
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
            },
        )
        assert r.status_code == 200
        d = r.json()
        assert d["dateRange"]["days"] == 7
        assert len(d["ga4"]["series"]) == 7

    def test_overview_invalid_lp(self, client):
        r = client.get(f"{API}/analytics/overview", params={"lp_id": "nope"})
        assert r.status_code == 404

    def test_traffic_sources(self, client, first_lp):
        r = client.get(f"{API}/analytics/ga4/traffic-sources", params={"lp_id": first_lp["id"]})
        assert r.status_code == 200
        rows = r.json()["rows"]
        assert len(rows) > 0
        assert {"source", "medium", "sessions", "bounceRate", "conversions"} <= set(rows[0].keys())

    def test_devices(self, client, first_lp):
        r = client.get(f"{API}/analytics/ga4/devices", params={"lp_id": first_lp["id"]})
        assert r.status_code == 200
        rows = r.json()["rows"]
        devices = {r_["device"] for r_ in rows}
        assert {"mobile", "desktop", "tablet"} <= devices

    def test_countries(self, client, first_lp):
        r = client.get(f"{API}/analytics/ga4/countries", params={"lp_id": first_lp["id"]})
        assert r.status_code == 200
        rows = r.json()["rows"]
        assert len(rows) >= 5
        assert "country" in rows[0] and "users" in rows[0]

    def test_realtime(self, client, first_lp):
        r = client.get(f"{API}/analytics/realtime", params={"lp_id": first_lp["id"]})
        assert r.status_code == 200
        d = r.json()
        assert "activeUsers" in d and "byCountry" in d and "perMinute" in d
        assert len(d["perMinute"]) >= 20

    def test_clarity(self, client, first_lp):
        r = client.get(f"{API}/analytics/clarity", params={"lp_id": first_lp["id"], "days": 2})
        assert r.status_code == 200
        d = r.json()
        assert "summary" in d and "hotspots" in d and "recordings" in d
        assert d["summary"]["rageClicks"] >= 0

    def test_compare(self, client, first_lp):
        today = date.today()
        a_end = today
        a_start = today - timedelta(days=6)
        b_end = a_start - timedelta(days=1)
        b_start = b_end - timedelta(days=6)
        r = client.get(
            f"{API}/analytics/compare",
            params={
                "lp_id": first_lp["id"],
                "period_a_start": a_start.isoformat(),
                "period_a_end": a_end.isoformat(),
                "period_b_start": b_start.isoformat(),
                "period_b_end": b_end.isoformat(),
            },
        )
        assert r.status_code == 200
        d = r.json()
        assert "a" in d and "b" in d and "delta" in d
        assert "summary" in d["a"] and "series" in d["a"]
        assert "sessions" in d["delta"]


# ---------- Credentials save/delete round-trip ----------
class TestCredentialsRoundTrip:
    def test_save_ga4_then_delete(self, client):
        fake_json = '{"type":"service_account","project_id":"x","private_key":"-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n","client_email":"a@b.iam.gserviceaccount.com"}'
        r = client.post(
            f"{API}/credentials",
            json={
                "provider": "ga4",
                "ga_service_account_json": fake_json,
                "ga_default_property_id": "999999999",
            },
        )
        assert r.status_code == 200
        assert r.json()["ga4_connected"] is True

        d = client.delete(f"{API}/credentials/ga4")
        assert d.status_code == 200
        assert d.json()["ga4_connected"] is False

    def test_save_clarity_then_delete(self, client):
        r = client.post(
            f"{API}/credentials",
            json={"provider": "clarity", "clarity_api_token": "TEST_fake_token"},
        )
        assert r.status_code == 200
        assert r.json()["clarity_connected"] is True

        d = client.delete(f"{API}/credentials/clarity")
        assert d.status_code == 200
        assert d.json()["clarity_connected"] is False
