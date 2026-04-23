"""Microsoft Clarity Data Export API wrapper.

The Clarity API is heavily rate-limited (10 requests / project / day,
1-3 day lookback window, max 3 dimensions, 1000 rows). We expose a
small facade and leave caching decisions to the caller.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)


class ClarityService:
    BASE_URL = "https://www.clarity.ms/export-data/api/v1"

    def __init__(self, token: str):
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def project_live_insights(
        self,
        num_of_days: int = 1,
        dimensions: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        num_of_days = max(1, min(3, int(num_of_days)))
        params: Dict[str, Any] = {"numOfDays": str(num_of_days)}
        if dimensions:
            for i, dim in enumerate(dimensions[:3], start=1):
                params[f"dimension{i}"] = dim
        resp = requests.get(
            f"{self.BASE_URL}/project-live-insights",
            params=params,
            headers=self.headers,
            timeout=15,
        )
        if resp.status_code == 401:
            raise ValueError("Clarity: unauthorised (check API token)")
        if resp.status_code == 403:
            raise ValueError("Clarity: forbidden (token lacks permissions)")
        if resp.status_code == 429:
            raise ValueError("Clarity: daily API limit exceeded")
        resp.raise_for_status()
        return resp.json()
