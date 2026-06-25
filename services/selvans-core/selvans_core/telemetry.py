"""
Telemetry — structured event logging backed by SQLite.
Keeps a bounded in-memory deque for fast dashboard reads.
"""
import json
import logging
from collections import deque
from typing import Any, Optional

import aiosqlite

from .config import SelvansCoreConfig
from .models import ConnectedApp, EventLevel, EventType, SelvansEvent

logger = logging.getLogger(__name__)

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS events (
    id        TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL,
    app_id    TEXT,
    app_type  TEXT,
    actor     TEXT,
    payload   TEXT,
    level     TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_ts     ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_app_id ON events(app_id);
CREATE INDEX IF NOT EXISTS idx_events_type   ON events(event_type);
"""


class Telemetry:

    def __init__(self, config: SelvansCoreConfig) -> None:
        self._db_path = config.events_db_path
        self._mem: deque[SelvansEvent] = deque(maxlen=config.events_max_memory)
        self._db: Optional[aiosqlite.Connection] = None

    async def init(self) -> None:
        self._db = await aiosqlite.connect(self._db_path)
        await self._db.executescript(_CREATE_TABLE)
        await self._db.commit()

    async def close(self) -> None:
        if self._db:
            await self._db.close()

    # ── Write ─────────────────────────────────────────────────────────────────

    async def log(self, event: SelvansEvent) -> None:
        self._mem.append(event)
        if self._db:
            try:
                await self._db.execute(
                    "INSERT INTO events VALUES (?,?,?,?,?,?,?,?)",
                    (
                        event.id,
                        event.timestamp.isoformat(),
                        event.event_type.value,
                        event.app_id,
                        event.app_type,
                        event.actor,
                        json.dumps(event.payload),
                        event.level.value,
                    ),
                )
                await self._db.commit()
            except Exception:
                logger.exception("Failed to persist event %s", event.id)

    async def log_app_connected(self, app: ConnectedApp) -> None:
        await self.log(SelvansEvent(
            event_type=EventType.APP_CONNECTED,
            app_id=app.app_id,
            app_type=app.app_type,
            actor="system",
            payload={"tools": len(getattr(app, "tools", [])),
                     "services": len(getattr(app, "services", []))},
        ))

    async def log_app_disconnected(self, app: ConnectedApp) -> None:
        await self.log(SelvansEvent(
            event_type=EventType.APP_DISCONNECTED,
            app_id=app.app_id,
            app_type=app.app_type,
            actor="system",
            payload={"uptime_seconds": app.uptime_seconds},
        ))

    async def log_structure_updated(self, app: ConnectedApp) -> None:
        await self.log(SelvansEvent(
            event_type=EventType.STRUCTURE_UPDATED,
            app_id=app.app_id,
            app_type=app.app_type,
            actor="system",
            payload={"route": getattr(app, "current_route", None)},
        ))

    async def log_tool_call(
        self, app: ConnectedApp, tool_name: str, actor: str, args: dict
    ) -> None:
        await self.log(SelvansEvent(
            event_type=EventType.TOOL_CALLED,
            app_id=app.app_id,
            app_type=app.app_type,
            actor=actor,
            payload={"tool": tool_name, "args": args},
        ))

    async def log_tool_result(
        self, app: ConnectedApp, tool_name: str, result: Any
    ) -> None:
        await self.log(SelvansEvent(
            event_type=EventType.TOOL_RESULT,
            app_id=app.app_id,
            app_type=app.app_type,
            actor="system",
            payload={"tool": tool_name, "result_type": type(result).__name__},
        ))

    async def log_tool_error(
        self, app: ConnectedApp, tool_name: str, error: str
    ) -> None:
        await self.log(SelvansEvent(
            event_type=EventType.TOOL_ERROR,
            app_id=app.app_id,
            app_type=app.app_type,
            actor="system",
            payload={"tool": tool_name, "error": error},
            level=EventLevel.ERROR,
        ))

    # ── Read ──────────────────────────────────────────────────────────────────

    def recent(self, limit: int = 50) -> list[SelvansEvent]:
        events = list(self._mem)
        events.sort(key=lambda e: e.timestamp, reverse=True)
        return events[:limit]

    async def query(
        self,
        app_id: Optional[str] = None,
        event_type: Optional[str] = None,
        level: Optional[str] = None,
        limit: int = 200,
    ) -> list[dict]:
        if not self._db:
            return []
        conditions = []
        params: list[Any] = []
        if app_id:
            conditions.append("app_id = ?")
            params.append(app_id)
        if event_type:
            conditions.append("event_type = ?")
            params.append(event_type)
        if level:
            conditions.append("level = ?")
            params.append(level)
        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        params.append(limit)
        async with self._db.execute(
            f"SELECT * FROM events {where} ORDER BY timestamp DESC LIMIT ?", params
        ) as cur:
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, row)) async for row in cur]
