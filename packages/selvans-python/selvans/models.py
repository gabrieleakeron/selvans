from typing import Any, Optional
from pydantic import BaseModel


class OperationDefinition(BaseModel):
    name: str
    description: str
    input_schema: dict[str, Any] = {}
    output_schema: Optional[dict[str, Any]] = None


class ServiceDefinition(BaseModel):
    name: str
    description: str
    operations: list[OperationDefinition] = []
