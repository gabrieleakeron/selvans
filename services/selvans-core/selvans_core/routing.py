"""
ToolRouter — parses namespaced tool names and dispatches calls
to the correct connected app.

Naming convention (separator: __)
  Frontend:   {appId}__fe__{toolName}
  Backend:    {appId}__be__{serviceName}__{operationName}
"""
import logging
from dataclasses import dataclass
from typing import Any, Literal

from .models import BackendApp, FrontendApp
from .registry import AppRegistry
from .telemetry import Telemetry

logger = logging.getLogger(__name__)

SEP = "__"


@dataclass
class ToolAddress:
    app_id: str
    app_type: Literal["fe", "be"]
    path: list[str]  # ["toolName"] for FE | ["service", "operation"] for BE


def parse_tool_name(name: str) -> ToolAddress:
    parts = name.split(SEP)
    # minimum parts: appId, appType, at least one path segment
    if len(parts) < 3:
        raise ValueError(f"Invalid tool name '{name}' — expected {{appId}}__{{fe|be}}__...")
    return ToolAddress(app_id=parts[0], app_type=parts[1], path=parts[2:])  # type: ignore[arg-type]


class ToolRouter:

    def __init__(self, registry: AppRegistry, telemetry: Telemetry) -> None:
        self.registry = registry
        self.telemetry = telemetry

    async def dispatch(
        self,
        tool_name: str,
        args: dict[str, Any],
        actor: str = "unknown",
    ) -> Any:
        addr = parse_tool_name(tool_name)
        app = self.registry.get(addr.app_id)

        if not app:
            raise ValueError(f"App '{addr.app_id}' is not connected to the Core")

        await self.telemetry.log_tool_call(app, tool_name, actor, args)

        try:
            if addr.app_type == "fe":
                if not isinstance(app, FrontendApp):
                    raise TypeError(f"App '{addr.app_id}' is not a frontend")
                result = await app.call_tool(addr.path[0], args)

            elif addr.app_type == "be":
                if not isinstance(app, BackendApp):
                    raise TypeError(f"App '{addr.app_id}' is not a backend")
                if len(addr.path) < 2:
                    raise ValueError("Backend tool path must be service__operation")
                result = await app.call_operation(addr.path[0], addr.path[1], args)

            else:
                raise ValueError(f"Unknown app type '{addr.app_type}' in tool name")

            await self.telemetry.log_tool_result(app, tool_name, result)
            return result

        except Exception as exc:
            await self.telemetry.log_tool_error(app, tool_name, str(exc))
            raise
