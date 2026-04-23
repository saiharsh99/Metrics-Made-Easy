"""Google Analytics 4 (Data API v1beta) wrapper.

If credentials are not present, callers should fall back to demo data.
This module isolates the real API surface so the rest of the app is
unaware of the underlying library.
"""
from __future__ import annotations

import json
import logging
import os
import tempfile
from datetime import date
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class GA4Service:
    def __init__(self, credentials_json: str, property_id: str):
        # We defer the heavy import so the app still boots when the
        # user has not yet connected GA4.
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.oauth2 import service_account

        info = json.loads(credentials_json)
        creds = service_account.Credentials.from_service_account_info(info)
        self.client = BetaAnalyticsDataClient(credentials=creds)
        self.property_id = str(property_id)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _parse_response(self, response) -> Dict[str, Any]:
        dim_headers = [h.name for h in response.dimension_headers]
        met_headers = [h.name for h in response.metric_headers]
        rows: List[Dict[str, Any]] = []
        for row in response.rows:
            item: Dict[str, Any] = {}
            for i, h in enumerate(dim_headers):
                item[h] = row.dimension_values[i].value
            for i, h in enumerate(met_headers):
                val = row.metric_values[i].value
                try:
                    item[h] = float(val) if "." in val else int(val)
                except (ValueError, TypeError):
                    item[h] = val
            rows.append(item)
        return {"dimensions": dim_headers, "metrics": met_headers, "rows": rows}

    def _run_report(
        self,
        dimensions: List[str],
        metrics: List[str],
        start_date: str,
        end_date: str,
        url_filter: Optional[str] = None,
        limit: int = 10000,
    ) -> Dict[str, Any]:
        from google.analytics.data_v1beta.types import (
            DateRange,
            Dimension,
            Filter,
            FilterExpression,
            Metric,
            RunReportRequest,
        )

        request = RunReportRequest(
            property=f"properties/{self.property_id}",
            dimensions=[Dimension(name=d) for d in dimensions],
            metrics=[Metric(name=m) for m in metrics],
            date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
            limit=limit,
        )
        if url_filter:
            request.dimension_filter = FilterExpression(
                filter=Filter(
                    field_name="pagePath",
                    string_filter=Filter.StringFilter(
                        match_type=Filter.StringFilter.MatchType.CONTAINS,
                        value=url_filter,
                    ),
                )
            )
        response = self.client.run_report(request)
        return self._parse_response(response)

    # ------------------------------------------------------------------
    # Public API used by the routes
    # ------------------------------------------------------------------
    def timeseries(
        self, start: str, end: str, url_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        return self._run_report(
            dimensions=["date"],
            metrics=[
                "sessions",
                "activeUsers",
                "screenPageViews",
                "conversions",
                "bounceRate",
                "averageSessionDuration",
            ],
            start_date=start,
            end_date=end,
            url_filter=url_filter,
        )

    def traffic_sources(
        self, start: str, end: str, url_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        return self._run_report(
            dimensions=["sessionSource", "sessionMedium"],
            metrics=["sessions", "bounceRate", "conversions"],
            start_date=start,
            end_date=end,
            url_filter=url_filter,
            limit=25,
        )

    def devices(self, start: str, end: str, url_filter: Optional[str] = None):
        return self._run_report(
            dimensions=["deviceCategory"],
            metrics=["sessions"],
            start_date=start,
            end_date=end,
            url_filter=url_filter,
        )

    def countries(self, start: str, end: str, url_filter: Optional[str] = None):
        return self._run_report(
            dimensions=["country"],
            metrics=["activeUsers", "sessions"],
            start_date=start,
            end_date=end,
            url_filter=url_filter,
            limit=15,
        )

    def sources_aggregate(
        self,
        start: str,
        end: str,
        url_filter: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Detailed source / medium / channel level performance."""
        return self._run_report(
            dimensions=[
                "sessionDefaultChannelGroup",
                "sessionSource",
                "sessionMedium",
            ],
            metrics=[
                "sessions",
                "activeUsers",
                "newUsers",
                "conversions",
                "bounceRate",
                "averageSessionDuration",
            ],
            start_date=start,
            end_date=end,
            url_filter=url_filter,
            limit=200,
        )

    def sources_trend(
        self,
        start: str,
        end: str,
        url_filter: Optional[str] = None,
    ) -> Dict[str, Any]:
        return self._run_report(
            dimensions=["date", "sessionDefaultChannelGroup"],
            metrics=["sessions"],
            start_date=start,
            end_date=end,
            url_filter=url_filter,
            limit=1000,
        )

    def audience_devices(self, start: str, end: str, url_filter: Optional[str] = None):
        return self._run_report(
            dimensions=["deviceCategory"],
            metrics=["sessions", "activeUsers"],
            start_date=start,
            end_date=end,
            url_filter=url_filter,
        )

    def audience_browsers(self, start: str, end: str, url_filter: Optional[str] = None):
        return self._run_report(
            dimensions=["browser"],
            metrics=["sessions"],
            start_date=start,
            end_date=end,
            url_filter=url_filter,
            limit=20,
        )

    def audience_os(self, start: str, end: str, url_filter: Optional[str] = None):
        return self._run_report(
            dimensions=["operatingSystem"],
            metrics=["sessions"],
            start_date=start,
            end_date=end,
            url_filter=url_filter,
            limit=20,
        )

    def audience_languages(self, start: str, end: str, url_filter: Optional[str] = None):
        return self._run_report(
            dimensions=["language"],
            metrics=["sessions"],
            start_date=start,
            end_date=end,
            url_filter=url_filter,
            limit=15,
        )

    def audience_new_returning(
        self, start: str, end: str, url_filter: Optional[str] = None
    ):
        return self._run_report(
            dimensions=["newVsReturning"],
            metrics=[
                "activeUsers",
                "sessions",
                "averageSessionDuration",
                "conversions",
            ],
            start_date=start,
            end_date=end,
            url_filter=url_filter,
        )

    def locations_countries(
        self, start: str, end: str, url_filter: Optional[str] = None
    ):
        return self._run_report(
            dimensions=["country", "countryId"],
            metrics=[
                "activeUsers",
                "sessions",
                "conversions",
                "bounceRate",
                "averageSessionDuration",
            ],
            start_date=start,
            end_date=end,
            url_filter=url_filter,
            limit=100,
        )

    def locations_cities(self, start: str, end: str, url_filter: Optional[str] = None):
        return self._run_report(
            dimensions=["city", "country"],
            metrics=["activeUsers", "sessions"],
            start_date=start,
            end_date=end,
            url_filter=url_filter,
            limit=100,
        )

    def realtime(self, url_filter: Optional[str] = None) -> Dict[str, Any]:
        from google.analytics.data_v1beta.types import (
            Dimension,
            Filter,
            FilterExpression,
            Metric,
            RunRealtimeReportRequest,
        )

        request = RunRealtimeReportRequest(
            property=f"properties/{self.property_id}",
            dimensions=[Dimension(name="country")],
            metrics=[Metric(name="activeUsers")],
        )
        response = self.client.run_realtime_report(request)
        return self._parse_response(response)
