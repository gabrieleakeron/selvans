"""
SelvansMcpServer — exposes all tools from all connected Selvans apps to external AI clients
(Claude Desktop, Cursor, any MCP-compatible client) via HTTP+SSE.

The tool list is built dynamically on every list_tools request,
so it always reflects the current set of connected apps.
"""
import logging
from typing import Any

from mcp.server import Server
from mcp.server.sse import SseServerTransport
from mcp.types import TextContent, Tool

from .registry import AppRegistry
from .routing import ToolRouter
from .telemetry import Telemetry

logger = logging.getLogger(__name__)


class SelvansMcpServer:

    def __init__(
        self,
        registry: AppRegistry,
        router: ToolRouter,
        telemetry: Telemetry,
        messages_path: str,
    ) -> None:
        self.registry = registry
        self.router = router
        self.telemetry = telemetry
        self.mcp = Server("selvans-core")
        self._transport = SseServerTransport(messages_path)
        self._register_handlers()

    def _register_handlers(self) -> None:

        @self.mcp.list_tools()
        async def list_tools() -> list[Tool]:
            return self.registry.mcp_tools()

        @self.mcp.call_tool()
        async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
            result = await self.router.dispatch(name, arguments, actor="mcp-client")
            return [TextContent(type="text", text=str(result))]

    @property
    def transport(self) -> SseServerTransport:
        return self._transport
