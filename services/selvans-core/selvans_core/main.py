"""
selvans Core entry point.

Exposes:
  WS   /Selvans/ws          ← Selvans-compliant apps (FE + BE) connect here
  GET  /mcp/sse         ← External AI clients (Claude Desktop, Cursor, …)
  POST /mcp/messages    ← MCP message channel
  GET  /ui/*            ← Admin UI (dashboard, app detail, events)
  GET  /health          ← Health check
"""
import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from .config import SelvansCoreConfig
from .hub import SelvansHub
from .mcp_server import SelvansMcpServer
from .registry import AppRegistry
from .routing import ToolRouter
from .telemetry import Telemetry
from .ui import router as ui_module

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

config = SelvansCoreConfig()
registry = AppRegistry()
telemetry = Telemetry(config)
hub = SelvansHub(registry, telemetry)
router = ToolRouter(registry, telemetry)
mcp = SelvansMcpServer(registry, router, telemetry, config.mcp_messages_path)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator:
    await telemetry.init()
    yield
    await telemetry.close()


app = FastAPI(
    title="selvans core",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── WebSocket hub ─────────────────────────────────────────────────────────────

@app.websocket(config.ws_path)
async def ws_endpoint(websocket: WebSocket):
    await hub.handle_connection(websocket)

# ── MCP SSE endpoints ─────────────────────────────────────────────────────────

@app.get(config.mcp_sse_path, include_in_schema=False)
async def mcp_sse(request: Request):
    async with mcp.transport.connect_sse(
        request.scope, request.receive, request._send  # type: ignore[attr-defined]
    ) as (read, write):
        await mcp.mcp.run(read, write, mcp.mcp.create_initialization_options())


@app.post(config.mcp_messages_path, include_in_schema=False)
async def mcp_messages(request: Request):
    await mcp.transport.handle_post_message(
        request.scope, request.receive, request._send  # type: ignore[attr-defined]
    )

# ── Admin UI ──────────────────────────────────────────────────────────────────

ui_module.init(registry, telemetry)
app.include_router(ui_module.ui_router, prefix=config.ui_prefix)

# Redirect / → /ui
@app.get("/", include_in_schema=False)
async def root():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/ui")

# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "apps_connected": len(registry.all_apps()),
        "frontends": len(registry.frontends()),
        "backends": len(registry.backends()),
    }
