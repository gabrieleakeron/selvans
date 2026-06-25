"""
SelvansAgent — optional standalone Claude agent for BE-only use cases.

In the full selvans stack, the agent loop runs inside selvans-core.
Use this class when you need a local agent that only calls backend tools
(no frontend interaction).
"""
from typing import Any, Optional

import anthropic

from .config import SelvansBeConfig
from .tools import SelvansTool

_DEFAULT_SYSTEM = (
    "You are a helpful AI assistant with access to backend tools. "
    "Use them to answer questions and perform tasks."
)


class SelvansAgent:

    def __init__(self, config: SelvansBeConfig) -> None:
        self.config = config
        self._client = anthropic.Anthropic(api_key=config.anthropic_api_key)
        self._tools: list[SelvansTool] = []

    def register_tool(self, tool: SelvansTool) -> None:
        self._tools.append(tool)

    def _tool_definitions(self) -> list[dict]:
        return [
            {"name": t.name, "description": t.description, "input_schema": t.input_schema}
            for t in self._tools
        ]

    async def _dispatch(self, name: str, args: dict[str, Any]) -> Any:
        tool = next((t for t in self._tools if t.name == name), None)
        if not tool:
            raise ValueError(f"Unknown tool: {name}")
        return await tool.execute(**args)

    async def run(self, prompt: str, system: Optional[str] = None) -> str:
        messages: list[dict] = [{"role": "user", "content": prompt}]
        tools = self._tool_definitions()

        while True:
            response = self._client.messages.create(
                model=self.config.model,
                max_tokens=self.config.max_tokens,
                system=system or _DEFAULT_SYSTEM,
                tools=tools,  # type: ignore[arg-type]
                messages=messages,
            )

            if response.stop_reason == "end_turn":
                return "".join(b.text for b in response.content if hasattr(b, "text"))

            if response.stop_reason == "tool_use":
                messages.append({"role": "assistant", "content": response.content})  # type: ignore[arg-type]
                results = []
                for block in response.content:
                    if block.type == "tool_use":
                        result = await self._dispatch(block.name, block.input)  # type: ignore[arg-type]
                        results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": str(result),
                        })
                messages.append({"role": "user", "content": results})
            else:
                break

        return ""
