"""
SelvansHub — WebSocket connection manager.

Accepts connections from any Selvans-compliant app (FE or BE).
Differentiates via the `appType` field in the registration message.

Protocol messages handled here:
  Inbound (app → core):
    registration      { type, appId, appType, ...fields }
    structure_update  { type, trees, currentRoute }       FE only
    services_update   { type, services }                  BE only
    tool_result       { type, id, result?, error? }       FE only
    operation_result  { type, id, result?, error? }       BE only
    pong              { type }

  Outbound (core → app):
    registration_ack  { type }
    tool_call         { type, id, tool, args }            FE only
    operation_call    { type, id, service, operation, args } BE only
    ping              { type }
"""
import json
import logging
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect

from .models import BackendApp, ConnectedApp, FrontendApp, ServiceDefinition
from .registry import AppRegistry
from .telemetry import Telemetry

logger = logging.getLogger(__name__)


class SelvansHub:

    def __init__(self, registry: AppRegistry, telemetry: Telemetry) -> None:
        self.registry = registry
        self.telemetry = telemetry

    async def handle_connection(self, websocket: WebSocket) -> None:
        await websocket.accept()
        app: Optional[ConnectedApp] = None

        try:
            async for raw in websocket.iter_text():
                msg: dict = json.loads(raw)

                # ── Registration ──────────────────────────────────────────────
                if msg["type"] == "registration":
                    app_type = msg.get("appType", "frontend")
                    app_id = msg.get("appId", "unknown")

                    if app_type == "frontend":
                        app = FrontendApp(
                            websocket=websocket,
                            app_id=app_id,
                            tools=msg.get("tools", []),
                            trees=msg.get("trees", []),
                            current_route=msg.get("currentRoute", "/"),
                        )
                    else:
                        app = BackendApp(
                            websocket=websocket,
                            app_id=app_id,
                            services=[
                                ServiceDefinition.model_validate(s)
                                for s in msg.get("services", [])
                            ],
                        )

                    self.registry.register(app)
                    await self.telemetry.log_app_connected(app)
                    logger.info("App registered: %s (%s)", app.app_id, app.app_type)
                    await websocket.send_json({"type": "registration_ack"})

                # ── FE: structure_update ──────────────────────────────────────
                elif msg["type"] == "structure_update" and isinstance(app, FrontendApp):
                    app.trees = msg.get("trees", app.trees)
                    app.current_route = msg.get("currentRoute", app.current_route)
                    await self.telemetry.log_structure_updated(app)

                # ── BE: services_update ───────────────────────────────────────
                elif msg["type"] == "services_update" and isinstance(app, BackendApp):
                    app.services = [
                        ServiceDefinition.model_validate(s)
                        for s in msg.get("services", [])
                    ]
                    await self.telemetry.log_structure_updated(app)

                # ── FE: tool_result ───────────────────────────────────────────
                elif msg["type"] == "tool_result" and isinstance(app, FrontendApp):
                    app.resolve(msg["id"], msg.get("result"), msg.get("error"))

                # ── BE: operation_result ──────────────────────────────────────
                elif msg["type"] == "operation_result" and isinstance(app, BackendApp):
                    app.resolve(msg["id"], msg.get("result"), msg.get("error"))

                elif msg["type"] == "pong":
                    pass

        except WebSocketDisconnect:
            pass
        except Exception:
            logger.exception("Unexpected error in WS connection for %s", getattr(app, "app_id", "?"))
        finally:
            if app:
                self.registry.unregister(app.app_id)
                await self.telemetry.log_app_disconnected(app)
                logger.info("App disconnected: %s", app.app_id)
