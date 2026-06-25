"""
Core data models — runtime app state, protocol messages, telemetry events.
"""
from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Literal, Optional

from fastapi import WebSocket
from pydantic import BaseModel


# ── BE service definitions ────────────────────────────────────────────────────

class OperationDefinition(BaseModel):
    name: str
    description: str
    input_schema: dict[str, Any] = {}
    output_schema: Optional[dict[str, Any]] = None


class ServiceDefinition(BaseModel):
    name: str
    description: str
    operations: list[OperationDefinition] = []


# ── Connected app runtime state ───────────────────────────────────────────────

class ConnectedAppBase:
    """Shared state and pending-call machinery for both FE and BE connections."""

    def __init__(self, websocket: WebSocket, app_id: str, app_type: str) -> None:
        self.websocket = websocket
        self.app_id = app_id
        self.app_type: Literal["frontend", "backend"] = app_type  # type: ignore[assignment]
        self.connected_at = datetime.utcnow()
        self._pending: dict[str, asyncio.Future[Any]] = {}

    async def _send_and_wait(self, message: dict, timeout: float = 30.0) -> Any:
        call_id = str(uuid.uuid4())
        future: asyncio.Future[Any] = asyncio.get_event_loop().create_future()
        self._pending[call_id] = future
        await self.websocket.send_json({**message, "id": call_id})
        try:
            return await asyncio.wait_for(future, timeout=timeout)
        except asyncio.TimeoutError:
            self._pending.pop(call_id, None)
            raise TimeoutError(f"Call '{message.get('type')}' on '{self.app_id}' timed out")

    def resolve(self, call_id: str, result: Any = None, error: Optional[str] = None) -> None:
        future = self._pending.pop(call_id, None)
        if future and not future.done():
            if error:
                future.set_exception(RuntimeError(error))
            else:
                future.set_result(result)

    @property
    def uptime_seconds(self) -> int:
        return int((datetime.utcnow() - self.connected_at).total_seconds())


class FrontendApp(ConnectedAppBase):
    """A connected Selvans-compliant Angular (or any web) frontend."""

    def __init__(
        self,
        websocket: WebSocket,
        app_id: str,
        tools: list[dict],
        trees: list[dict],
        current_route: str,
    ) -> None:
        super().__init__(websocket, app_id, "frontend")
        self.tools: list[dict] = tools
        self.trees: list[dict] = trees
        self.current_route: str = current_route

    async def call_tool(self, tool_name: str, args: dict[str, Any]) -> Any:
        return await self._send_and_wait({"type": "tool_call", "tool": tool_name, "args": args})


class BackendApp(ConnectedAppBase):
    """A connected Selvans-compliant Python (or any) backend service."""

    def __init__(
        self,
        websocket: WebSocket,
        app_id: str,
        services: list[ServiceDefinition],
    ) -> None:
        super().__init__(websocket, app_id, "backend")
        self.services: list[ServiceDefinition] = services

    async def call_operation(self, service: str, operation: str, args: dict[str, Any]) -> Any:
        return await self._send_and_wait({
            "type": "operation_call",
            "service": service,
            "operation": operation,
            "args": args,
        })


ConnectedApp = FrontendApp | BackendApp


# ── Telemetry ─────────────────────────────────────────────────────────────────

class EventType(str, Enum):
    APP_CONNECTED     = "app.connected"
    APP_DISCONNECTED  = "app.disconnected"
    STRUCTURE_UPDATED = "structure.updated"
    TOOL_CALLED       = "tool.called"
    TOOL_RESULT       = "tool.result"
    TOOL_ERROR        = "tool.error"
    MCP_REQUEST       = "mcp.request"


class EventLevel(str, Enum):
    INFO  = "info"
    WARN  = "warn"
    ERROR = "error"


@dataclass
class SelvansEvent:
    event_type: EventType
    app_id: str
    app_type: str           # frontend | backend | core
    actor: str              # claude | chatgpt | system | user
    payload: dict[str, Any]
    level: EventLevel = EventLevel.INFO
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = field(default_factory=datetime.utcnow)
