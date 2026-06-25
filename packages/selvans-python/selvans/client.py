"""
SelvansCoreClient — WebSocket client that connects to selvans-core,
registers backend services, and handles incoming operation_call messages.

Protocol messages handled:
  Outbound (BE → Core):
    registration      { type, appId, appType:"backend", services }
    operation_result  { type, id, result?, error? }
    pong              { type }

  Inbound (Core → BE):
    registration_ack  { type }
    operation_call    { type, id, service, operation, args }
    ping              { type }
"""
import asyncio
import json
import logging
from typing import TYPE_CHECKING

import websockets

from .config import SelvansBeConfig

if TYPE_CHECKING:
    from .services import SelvansService

logger = logging.getLogger(__name__)


class SelvansCoreClient:

    def __init__(self, config: SelvansBeConfig) -> None:
        self.config = config
        self._services: dict[str, "SelvansService"] = {}
        self._registration: list[dict] = []
        self._task: asyncio.Task | None = None

    def register_service(self, svc: "SelvansService") -> None:
        self._services[svc.name] = svc
        self._registration.append(svc.to_definition().model_dump())

    def start(self) -> None:
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            self._task = None

    # ── Connection loop ───────────────────────────────────────────────────────

    async def _run(self) -> None:
        ws_url = self.config.core_url.replace("http", "ws") + "/Selvans/ws"
        while True:
            try:
                async with websockets.connect(ws_url) as ws:
                    logger.info("Connected to selvans-core at %s", ws_url)
                    await ws.send(json.dumps({
                        "type": "registration",
                        "appId": self.config.app_id,
                        "appType": "backend",
                        "services": self._registration,
                    }))
                    async for raw in ws:
                        await self._handle(ws, json.loads(raw))
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning(
                    "Core connection lost: %s. Reconnecting in %.0fs…",
                    exc,
                    self.config.reconnect_delay,
                )
                await asyncio.sleep(self.config.reconnect_delay)

    # ── Message dispatch ──────────────────────────────────────────────────────

    async def _handle(self, ws, msg: dict) -> None:
        t = msg.get("type")

        if t == "registration_ack":
            logger.info(
                "Registered with Core as '%s' (%d services)",
                self.config.app_id, len(self._services),
            )

        elif t == "operation_call":
            await self._dispatch_operation(ws, msg)

        elif t == "ping":
            await ws.send(json.dumps({"type": "pong"}))

    async def _dispatch_operation(self, ws, msg: dict) -> None:
        call_id: str = msg["id"]
        service_name: str = msg["service"]
        operation_name: str = msg["operation"]
        args: dict = msg.get("args", {})

        svc = self._services.get(service_name)
        if not svc:
            await ws.send(json.dumps({
                "type": "operation_result",
                "id": call_id,
                "error": f"Service '{service_name}' not registered in '{self.config.app_id}'",
            }))
            return

        try:
            result = await svc.dispatch(operation_name, args)
            await ws.send(json.dumps({
                "type": "operation_result",
                "id": call_id,
                "result": result,
            }))
        except Exception as exc:
            logger.exception("Error in %s.%s", service_name, operation_name)
            await ws.send(json.dumps({
                "type": "operation_result",
                "id": call_id,
                "error": str(exc),
            }))
