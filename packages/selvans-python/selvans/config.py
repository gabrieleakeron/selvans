from dataclasses import dataclass
from typing import Optional


@dataclass
class SelvansBeConfig:
    # selvans-core connection
    core_url: str = "http://localhost:8080"
    app_id: str = "be-app"

    # Reconnection
    reconnect_delay: float = 3.0

    # Optional local agent (Claude) — used only when running SelvansAgent standalone
    anthropic_api_key: Optional[str] = None
    model: str = "claude-opus-4-8"
    max_tokens: int = 4096
