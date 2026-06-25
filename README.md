# selvans

**selvans** is a framework that makes any web application natively operable by AI agents through the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/).

Instead of using browser automation, AI agents connect directly to your application through a structured protocol — observing the UI semantic tree and calling typed tools to interact with it.

---

## How It Works

```
 External AI (Claude Desktop, Cursor…)
          │  MCP / SSE
          ▼
  ┌──────────────────┐
  │  selvans-core │  ← Hub service (WebSocket + MCP server + admin UI)
  └──────┬─────┬─────┘
         │ WS  │ WS
    ┌────┘     └────┐
    ▼               ▼
Angular App    Python Backend
(selvans-   (selvans-
  angular)       python)
```

1. **selvans-core** is the central hub. It exposes an MCP server (SSE) that external AI clients connect to, and a WebSocket endpoint that your frontend and backend connect to.
2. **selvans-angular** integrates into your Angular app. It registers a semantic UI tree and built-in tools (`click_element`, `form_input`, `get_page_state`…) with the Core.
3. **selvans-python** integrates into your Python/FastAPI backend. It registers typed service operations with the Core.
4. The AI calls tools and operations through the Core, which routes them to the right app in real time.

---

## Repository Structure

```
selvans/
├── packages/
│   ├── selvans-angular/       # Angular library (npm)
│   └── selvans-python/        # Python client library (PyPI)
├── services/
│   └── selvans-core/          # Hub service (Docker)
├── demos/
│   ├── selvans-angular-demo/  # Angular demo app
│   └── selvans-python-demo/   # FastAPI demo backend
└── docker-compose.yml
```

---

## Quick Start

### One command (recommended)

**Dev** (Node 18+ + pnpm + Docker):

```bash
pnpm run setup
```

This starts Core (:8080) + Python demo (:8001) + Angular demo (:4200) — **all in Docker**, including the Angular dev server with live-reload. Open http://localhost:4200 — the `selvans-panel` should show **"connected"**.

> **Live-reload**: the Angular source is bind-mounted into the container. Saving a file in `demos/selvans-angular-demo/` or `packages/selvans-angular/` triggers an automatic browser update (~1 s latency due to polling on Docker Desktop Windows).
>
> **First startup**: the Angular container build (esbuild + pnpm install inside the container) takes 1-3 minutes. `pnpm run setup` waits up to 180 s for `:4200` to respond.

**Non-technical / profano** (Docker only — no Node/pnpm needed):

```bash
# macOS / Linux
./scripts/setup.sh --docker

# Windows
scripts\setup.bat --docker

# Or directly:
docker compose --profile full up --build
```

> **Note:** the `--docker` / `--profile full` path uses the **nginx** container (`selvans-angular-demo`, profile `full`) — a static production-like bundle on `:4200`. Do **not** run it together with `pnpm run setup` (both bind port 4200).

See [[Getting-started]] in the wiki for the full guide, prerequisites per persona, and troubleshooting.

---

### Manual start

#### 1. Start the Core

```bash
docker compose up selvans-core
# Admin UI → http://localhost:8080/ui
# MCP SSE  → http://localhost:8080/mcp/sse
```

### 2. Integrate the Angular Frontend

```bash
npm install selvans-angular
```

```typescript
// app.module.ts
import { SelvansModule } from 'selvans-angular';

@NgModule({
  imports: [
    SelvansModule.forRoot({
      coreUrl: 'http://localhost:8080',
      appId: 'my-app'
    })
  ]
})
export class AppModule {}
```

Mark your components with semantic directives:

```html
<main [SelvansNode]="{ id: 'main', template: 'layout', description: 'Main content area' }">
  <form [SelvansNode]="{ id: 'login-form', template: 'form', description: 'User login form' }">
    <input [SelvansTarget]="'email-input'" type="email" />
    <button [SelvansTarget]="'submit-btn'">Login</button>
  </form>
</main>
```

### 3. Integrate the Python Backend

```bash
pip install selvans
```

```python
# main.py
from selvans import SelvansBeApp, SelvansBeConfig, SelvansService, operation

class TaskService(SelvansService):
    name = "tasks"
    description = "Task management"

    @operation("list", description="List tasks, optionally filtered by status")
    async def list_tasks(self, status: str = "") -> list[dict]:
        return await db.list_tasks(status=status)

    @operation("create", description="Create a new task")
    async def create_task(self, title: str, priority: str = "medium") -> dict:
        return await db.create_task(title, priority)

surface = SelvansBeApp(SelvansBeConfig(core_url="http://localhost:8080"))
surface.register(TaskService())
app = surface.create_app()
```

### 4. Connect an AI Client

Add the Core's MCP endpoint to your AI client (e.g. Claude Desktop `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "selvans": {
      "url": "http://localhost:8080/mcp/sse"
    }
  }
}
```

The AI can now observe your app's UI and call your backend operations directly.

---

## Run the Full Demo

```bash
pnpm run setup
# → Core :8080 + Python demo :8001 + Angular dev container :4200 (live-reload)
```

Or all-in-Docker prod-like (no Node required):

```bash
docker compose --profile full up --build
# → Core :8080 + Python demo :8001 + Angular nginx :4200 (static bundle)
```

| Service              | URL                            | Mode                        |
|----------------------|--------------------------------|-----------------------------|
| selvans-core      | http://localhost:8080          | both                        |
| Admin UI             | http://localhost:8080/ui       | both                        |
| MCP SSE endpoint     | http://localhost:8080/mcp/sse  | both                        |
| Python demo backend  | http://localhost:8001          | both                        |
| Angular demo frontend| http://localhost:4200          | dev (live-reload) / prod-like (nginx) |

> **Note:** `selvans-angular-dev` (dev, live-reload) and `selvans-angular-demo` (profile `full`, nginx) both bind port 4200 — do not start them together.

---

## Packages

| Package | Description | Docs |
|---------|-------------|------|
| `selvans-angular` | Angular library — semantic UI tree + built-in tools | [docs](packages/selvans-angular/) |
| `selvans-python` | Python library — FastAPI integration + service operations | [docs](packages/selvans-python/) |
| `selvans-core` | Hub service — MCP server + WebSocket hub + admin UI | [docs](services/selvans-core/) |

---

## Built-in Frontend Tools

The Angular library registers these tools automatically:

| Tool | Description |
|------|-------------|
| `get_page_state` | Returns current URL, title, and visible text |
| `navigate` | Navigate to a route by path |
| `get_elements` | List all elements marked with `[SelvansTarget]` |
| `click_element` | Click an element by its target ID |
| `form_input` | Read or set the value of a form field by target ID |

---

## License

Distributed under the Apache 2.0 license — see LICENSE and NOTICE.
