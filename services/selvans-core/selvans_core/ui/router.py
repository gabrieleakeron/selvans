import os
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from ..models import BackendApp, FrontendApp
from ..registry import AppRegistry
from ..telemetry import Telemetry

_TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")
templates = Jinja2Templates(directory=_TEMPLATES_DIR)

ui_router = APIRouter()

# Injected by main.py after construction
_registry: Optional[AppRegistry] = None
_telemetry: Optional[Telemetry] = None


def init(registry: AppRegistry, telemetry: Telemetry) -> None:
    global _registry, _telemetry
    _registry = registry
    _telemetry = telemetry


# ── Full pages ────────────────────────────────────────────────────────────────

@ui_router.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    apps = _registry.all_apps() if _registry else []
    events = _telemetry.recent(20) if _telemetry else []
    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "apps": apps,
        "events": events,
        "fe_count": sum(1 for a in apps if isinstance(a, FrontendApp)),
        "be_count": sum(1 for a in apps if isinstance(a, BackendApp)),
    })


@ui_router.get("/apps/{app_id}", response_class=HTMLResponse)
async def app_detail(request: Request, app_id: str):
    app = _registry.get(app_id) if _registry else None
    events = []
    if _telemetry and app:
        events = await _telemetry.query(app_id=app_id, limit=50)
    return templates.TemplateResponse("app_detail.html", {
        "request": request,
        "app": app,
        "events": events,
    })


@ui_router.get("/events", response_class=HTMLResponse)
async def events_page(
    request: Request,
    app_id: Optional[str] = None,
    event_type: Optional[str] = None,
    level: Optional[str] = None,
):
    rows = []
    if _telemetry:
        rows = await _telemetry.query(app_id=app_id, event_type=event_type, level=level)
    apps = _registry.all_apps() if _registry else []
    return templates.TemplateResponse("events.html", {
        "request": request,
        "events": rows,
        "apps": apps,
        "filter_app": app_id,
        "filter_type": event_type,
        "filter_level": level,
    })


# ── HTMX partials ─────────────────────────────────────────────────────────────

@ui_router.get("/partials/apps", response_class=HTMLResponse)
async def partial_apps(request: Request):
    apps = _registry.all_apps() if _registry else []
    return templates.TemplateResponse("partials/apps.html", {
        "request": request,
        "apps": apps,
        "fe_count": sum(1 for a in apps if isinstance(a, FrontendApp)),
        "be_count": sum(1 for a in apps if isinstance(a, BackendApp)),
    })


@ui_router.get("/partials/events/recent", response_class=HTMLResponse)
async def partial_events_recent(request: Request):
    events = _telemetry.recent(30) if _telemetry else []
    return templates.TemplateResponse("partials/events_recent.html", {
        "request": request,
        "events": events,
    })
