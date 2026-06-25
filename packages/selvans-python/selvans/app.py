"""
SelvansBeApp — FastAPI integration for Selvans-compliant Python backends.

Typical usage:

    from selvans import SelvansBeApp, SelvansBeConfig, SelvansService, operation

    class OrderService(SelvansService):
        name = "orders"
        description = "Order management"

        @operation("list", description="List orders")
        async def list_orders(self, status: str | None = None) -> list[dict]:
            return await db.list_orders(status=status)

    surface = SelvansBeApp(SelvansBeConfig(app_id="order-service"))
    surface.register(OrderService())

    app = surface.create_app()        # standalone FastAPI
    # or: surface.mount(existing_app) # mount on existing app
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from .client import SelvansCoreClient
from .config import SelvansBeConfig
from .services import SelvansService


class SelvansBeApp:

    def __init__(self, config: SelvansBeConfig | None = None) -> None:
        self.config = config or SelvansBeConfig()
        self._client = SelvansCoreClient(self.config)

    def register(self, service: SelvansService) -> "SelvansBeApp":
        """Register a service. Returns self for chaining."""
        self._client.register_service(service)
        return self

    # ── FastAPI integration ───────────────────────────────────────────────────

    def mount(self, app: FastAPI) -> None:
        """Add the Core WS lifecycle to an existing FastAPI application."""
        original = app.router.lifespan_context

        @asynccontextmanager
        async def lifespan(a: FastAPI) -> AsyncGenerator:
            self._client.start()
            try:
                if original:
                    async with original(a):
                        yield
                else:
                    yield
            finally:
                await self._client.stop()

        app.router.lifespan_context = lifespan

    def create_app(self) -> FastAPI:
        """Create and return a standalone FastAPI application."""
        @asynccontextmanager
        async def lifespan(_: FastAPI) -> AsyncGenerator:
            self._client.start()
            try:
                yield
            finally:
                await self._client.stop()

        return FastAPI(
            title=self.config.app_id,
            lifespan=lifespan,
        )
