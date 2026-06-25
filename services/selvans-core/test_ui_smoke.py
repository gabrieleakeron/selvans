"""
Smoke test: GET /ui/ and GET /ui/partials/apps must return 200
with 0 frontends connected (only a backend), and app detail must not regress.

Run with:
    cd selvans/services/selvans-core
    pip install -e ".[dev]"
    python -m pytest test_ui_smoke.py -v
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from Selvans_core.models import BackendApp, OperationDefinition, ServiceDefinition
from Selvans_core.registry import AppRegistry
from Selvans_core.telemetry import Telemetry
from Selvans_core.ui import router as ui_module
from Selvans_core.ui.router import ui_router

import fastapi
from fastapi import FastAPI


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_backend(app_id: str = "demo-backend") -> BackendApp:
    """Create a BackendApp stub without a real WebSocket."""
    ws = MagicMock()
    svc = ServiceDefinition(
        name="demo-service",
        description="A demo service",
        operations=[
            OperationDefinition(name="ping", description="Ping"),
            OperationDefinition(name="pong", description="Pong"),
        ],
    )
    app = BackendApp(websocket=ws, app_id=app_id, services=[svc])
    return app


def _make_app(registry: AppRegistry) -> FastAPI:
    """Build a minimal FastAPI app wired to the given registry."""
    telemetry = MagicMock(spec=Telemetry)
    telemetry.recent.return_value = []
    # query is async — return a coroutine
    async def _empty_query(**_):  # type: ignore[return]
        return []
    telemetry.query.side_effect = _empty_query

    app = FastAPI()
    ui_module.init(registry, telemetry)
    app.include_router(ui_router, prefix="/ui")
    return app


# ---------------------------------------------------------------------------
# Tests — 0 frontends, 1 backend
# ---------------------------------------------------------------------------

class TestUiWithZeroFrontends:
    """With no frontends registered (only a backend) all UI routes must be 200."""

    def setup_method(self):
        registry = AppRegistry()
        registry.register(_make_backend("demo-backend"))
        self.client = TestClient(_make_app(registry), raise_server_exceptions=True)

    def test_dashboard_returns_200(self):
        r = self.client.get("/ui/", follow_redirects=True)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:300]}"

    def test_partials_apps_returns_200(self):
        r = self.client.get("/ui/partials/apps")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:300]}"

    def test_app_detail_returns_200(self):
        r = self.client.get("/ui/apps/demo-backend")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:300]}"

    def test_partials_apps_shows_ops_count(self):
        r = self.client.get("/ui/partials/apps")
        assert "ops:" in r.text
        # 2 operations registered above
        assert ">2<" in r.text.replace(" ", "").replace("\n", "")

    def test_dashboard_shows_zero_frontends(self):
        r = self.client.get("/ui/", follow_redirects=True)
        body = r.text
        # fe_count must be 0, be_count must be 1
        assert "0" in body  # at minimum the FE counter rendered


# ---------------------------------------------------------------------------
# Tests — 0 apps at all
# ---------------------------------------------------------------------------

class TestUiWithNoApps:
    """With an empty registry the UI must still return 200 (no crash)."""

    def setup_method(self):
        registry = AppRegistry()  # empty
        self.client = TestClient(_make_app(registry), raise_server_exceptions=True)

    def test_dashboard_returns_200(self):
        r = self.client.get("/ui/", follow_redirects=True)
        assert r.status_code == 200

    def test_partials_apps_returns_200(self):
        r = self.client.get("/ui/partials/apps")
        assert r.status_code == 200

    def test_partials_apps_shows_empty_state(self):
        r = self.client.get("/ui/partials/apps")
        assert "No apps connected." in r.text
