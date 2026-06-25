"""
Service/operation registry for Selvans-compliant Python backends.

Usage:

    from selvans import SelvansService, operation

    class OrderService(SelvansService):
        name = "orders"
        description = "Order management"

        @operation("list", description="List orders with optional status filter")
        async def list_orders(self, status: str | None = None) -> list[dict]:
            ...

        @operation("create", description="Create a new order")
        async def create_order(self, items: list, user_id: str) -> dict:
            ...

    surface.register(OrderService())
"""
import inspect
import typing
from typing import Any, Callable

from .models import OperationDefinition, ServiceDefinition

_OP_ATTR = "_Selvans_operation"


# ── Decorator ─────────────────────────────────────────────────────────────────

def operation(name: str, description: str = "", output_schema: dict | None = None):
    """Marks an async method as a selvans operation."""
    def decorator(func: Callable) -> Callable:
        setattr(func, _OP_ATTR, {
            "name": name,
            "description": description,
            "output_schema": output_schema,
        })
        return func
    return decorator


# ── Schema inference ──────────────────────────────────────────────────────────

def _hint_to_schema(hint: Any) -> dict:
    if hint in (None, inspect.Parameter.empty):
        return {}
    if hint is str:   return {"type": "string"}
    if hint is int:   return {"type": "integer"}
    if hint is float: return {"type": "number"}
    if hint is bool:  return {"type": "boolean"}
    if hint is list:  return {"type": "array", "items": {}}
    if hint is dict:  return {"type": "object"}

    origin = getattr(hint, "__origin__", None)
    if origin is typing.Union:
        non_none = [a for a in hint.__args__ if a is not type(None)]
        if len(non_none) == 1:
            return _hint_to_schema(non_none[0])

    # Pydantic model
    if hasattr(hint, "model_json_schema"):
        return hint.model_json_schema()

    return {}


def _build_input_schema(func: Callable) -> dict:
    try:
        hints = typing.get_type_hints(func)
    except Exception:
        hints = {}
    sig = inspect.signature(func)
    properties: dict[str, Any] = {}
    required: list[str] = []
    for param_name, param in sig.parameters.items():
        if param_name in ("self", "cls"):
            continue
        properties[param_name] = _hint_to_schema(hints.get(param_name))
        if param.default is inspect.Parameter.empty:
            required.append(param_name)
    return {"type": "object", "properties": properties, "required": required}


# ── Base class ────────────────────────────────────────────────────────────────

class SelvansService:
    """Base class for Selvans-compliant backend services."""

    name: str = ""
    description: str = ""

    def to_definition(self) -> ServiceDefinition:
        ops: list[OperationDefinition] = []
        for _, method in inspect.getmembers(self, predicate=inspect.ismethod):
            meta = getattr(method, _OP_ATTR, None)
            if meta:
                ops.append(OperationDefinition(
                    name=meta["name"],
                    description=meta["description"],
                    input_schema=_build_input_schema(method),
                    output_schema=meta.get("output_schema"),
                ))
        return ServiceDefinition(
            name=self.name,
            description=self.description,
            operations=ops,
        )

    async def dispatch(self, operation_name: str, args: dict[str, Any]) -> Any:
        """Route an incoming operation_call to the decorated method."""
        for _, method in inspect.getmembers(self, predicate=inspect.ismethod):
            meta = getattr(method, _OP_ATTR, None)
            if meta and meta["name"] == operation_name:
                return await method(**args)
        raise ValueError(f"Operation '{operation_name}' not found in '{self.name}'")
