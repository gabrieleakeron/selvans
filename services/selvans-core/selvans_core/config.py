from pydantic_settings import BaseSettings, SettingsConfigDict


class SelvansCoreConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="Selvans_")

    host: str = "0.0.0.0"
    port: int = 8080

    # WebSocket endpoint (Selvans-compliant FE and BE apps connect here)
    ws_path: str = "/Selvans/ws"

    # MCP SSE endpoint (external AI clients: Claude Desktop, Cursor, etc.)
    mcp_sse_path: str = "/mcp/sse"
    mcp_messages_path: str = "/mcp/messages"

    # Admin UI mount point
    ui_prefix: str = "/ui"

    # Telemetry
    events_db_path: str = "/data/events.db"
    events_max_memory: int = 1000  # in-memory deque size for dashboard

    # CORS
    allowed_origins: list[str] = ["*"]
