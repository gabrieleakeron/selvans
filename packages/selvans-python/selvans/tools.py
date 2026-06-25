from abc import ABC, abstractmethod
from typing import Any


class SelvansTool(ABC):
    """Base class for server-side MCP tools registered in the Python backend."""

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def description(self) -> str: ...

    @property
    @abstractmethod
    def input_schema(self) -> dict[str, Any]: ...

    @abstractmethod
    async def execute(self, **kwargs: Any) -> Any: ...
