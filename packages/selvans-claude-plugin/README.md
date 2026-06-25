# selvans — Claude Code plugin

Plugin per **avviare il Core selvans** e **pilotare** qualsiasi app FE/BE collegata, in modo
generico (gli app id si scoprono a runtime, niente di cablato).

## Flusso

```
1. install plugin            → MCP-bundle + commands + skill + agents
2. /selvans:selvans-setup     → docker: SOLO Core :8080 (le N app stanno FUORI dal plugin)
3. (fuori) avvii le tue app  → si collegano al Core, registrano i loro tool
4. /selvans:selvans-doctor    → check veloce: Core su? quante FE/BE collegate?
5. agent selvans-scout           → discovery profonda: QUALI app e COME usarle → App Map (in cache)
6. agent selvans-driver          → esegue il task sulle app usando la App Map
```

> La preview (`Claude_Preview`) è un **browser interattivo integrato in Claude** (non screenshot):
> agganciala a un'app FE già attiva (es. `:4200`) per il riscontro visivo. I tool selvans restano
> il canale d'azione **semantico**. La preview *mostra*, selvans *agisce*.

## Contenuto

| Artefatto | Tipo | Cosa fa |
|---|---|---|
| `/selvans:selvans-setup` | command | `docker compose up -d selvans-core` + poll `/health`. **Solo Core** (idempotente). |
| `/selvans:selvans-doctor` | command | Check veloce: Core raggiungibile? quante app FE/BE collegate? |
| `selvans-drive` | skill | Manuale condiviso: discovery + loop FE + chiamate BE + verifica. |
| `selvans-scout` | agent | Read-only. Produce la **App Map** (app id, tool, routes/targets, services/ops, howto). Cache + freshness. |
| `selvans-driver` | agent | Esegue task multi-step su FE+BE usando la App Map. Muta stato, verifica gli effetti. |
| `.mcp.json` | config | Registra l'MCP `selvans` (SSE `:8080/mcp/sse`). |

## Installazione (dev)

Dalla root del monorepo `selvans/`:

```bash
# Via sessione (più rapido per sviluppo)
claude --plugin-dir packages/selvans-claude-plugin

# Oppure via marketplace locale
claude plugin marketplace add packages/selvans-claude-plugin/.claude-plugin/marketplace.json
claude plugin install selvans@selvans-local
```

Dopo l'install, `/reload-plugins` se hai abilitato/disabilitato a sessione attiva.

## Come funziona la discovery

I tool sono **dinamici e namespacati per app**: `mcp__selvans__<appId>__fe__*` e
`mcp__selvans__<appId>__be__<service>__<op>`. Sono anche **deferred**: vanno caricati con
`ToolSearch "mcp__selvans__"` prima di poterli chiamare. Gli agenti `selvans-scout`/`selvans-driver` lo fanno
in autonomia; la skill `selvans-drive` documenta il pattern.

## Config

- `Selvans_CORE_URL` — override dell'URL del Core (default `http://localhost:8080`), usato da `selvans-doctor.mjs`.
- `Selvans_CORE_COMPOSE` — path al `docker-compose.yml` del monorepo, se non risolvibile da
  `$CLAUDE_PLUGIN_ROOT/../../docker-compose.yml`.
- App Map in cache: `$CLAUDE_PLUGIN_DATA/Selvans-app-map.json`.
