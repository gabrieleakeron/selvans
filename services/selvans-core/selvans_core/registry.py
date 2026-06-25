"""
AppRegistry — tracks all connected Selvans apps (FE + BE) and exposes their
capabilities as a namespaced MCP tool list.

Tool naming convention:
  Frontend tool:      {appId}__fe__{toolName}
  Backend operation:  {appId}__be__{serviceName}__{operationName}
"""
from typing import Optional

from mcp.types import Tool

from .models import BackendApp, ConnectedApp, FrontendApp

SEP = "__"


def fe_tool_name(app_id: str, tool_name: str) -> str:
    return SEP.join([app_id, "fe", tool_name])


def be_tool_name(app_id: str, service: str, operation: str) -> str:
    return SEP.join([app_id, "be", service, operation])


class AppRegistry:

    def __init__(self) -> None:
        self._apps: dict[str, ConnectedApp] = {}

    def register(self, app: ConnectedApp) -> None:
        self._apps[app.app_id] = app

    def unregister(self, app_id: str) -> None:
        self._apps.pop(app_id, None)

    def get(self, app_id: str) -> Optional[ConnectedApp]:
        return self._apps.get(app_id)

    def all_apps(self) -> list[ConnectedApp]:
        return list(self._apps.values())

    def frontends(self) -> list[FrontendApp]:
        return [a for a in self._apps.values() if isinstance(a, FrontendApp)]

    def backends(self) -> list[BackendApp]:
        return [a for a in self._apps.values() if isinstance(a, BackendApp)]

    def mcp_tools(self) -> list[Tool]:
        """
        Returns all tools from all connected apps, namespaced and annotated
        with provenance metadata in their descriptions.
        """
        tools: list[Tool] = []

        for app in self.frontends():
            for t in app.tools:
                tools.append(Tool(
                    name=fe_tool_name(app.app_id, t["name"]),
                    description=(
                        f"[app:{app.app_id}][type:frontend][tool:{t['name']}] {t['description']}"
                    ),
                    inputSchema=t.get("inputSchema", {"type": "object", "properties": {}}),
                ))

        for app in self.backends():
            for svc in app.services:
                for op in svc.operations:
                    tools.append(Tool(
                        name=be_tool_name(app.app_id, svc.name, op.name),
                        description=(
                            f"[app:{app.app_id}][type:backend]"
                            f"[service:{svc.name}][op:{op.name}] {op.description}"
                        ),
                        inputSchema=op.input_schema or {"type": "object", "properties": {}},
                    ))

        return tools
