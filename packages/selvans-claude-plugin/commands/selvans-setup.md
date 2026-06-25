---
description: Avvia SOLO il Core selvans (Docker, :8080) e attende che sia healthy. Non avvia le demo — le app si avviano fuori dal plugin.
allowed-tools: Bash
---

Avvia il **Core selvans** (solo il servizio `selvans-core`) e verifica che sia pronto.
NON avviare le demo Angular/Python: le app vanno avviate fuori dal plugin e si collegano al Core.

Esegui esattamente questi passi:

1. **Porta su il Core** via Docker. Il `docker-compose.yml` del monorepo è due livelli sopra il plugin:

   ```bash
   docker compose -f "$CLAUDE_PLUGIN_ROOT/../../docker-compose.yml" up -d selvans-core
   ```

   Se quel path non esiste, prova in quest'ordine: `$CLAUDE_PROJECT_DIR/docker-compose.yml`, poi l'env
   `$Selvans_CORE_COMPOSE`. Se nessuno esiste, fermati e chiedi all'utente dov'è il `docker-compose.yml` del
   monorepo selvans.

2. **Attendi la readiness** del Core (poll di `/health`, fino a 90s):

   ```bash
   node "$CLAUDE_PLUGIN_ROOT/scripts/selvans-doctor.mjs" --wait
   ```

3. **Riporta** all'utente in forma sintetica: stato del Core, numero di app collegate (FE/BE), e gli URL
   (Admin UI `http://localhost:8080/ui`, MCP `http://localhost:8080/mcp/sse`).

Note:
- È **idempotente**: se il Core è già su, `docker compose up -d` è un no-op e il poll passa subito.
- Dopo il setup: `/selvans:selvans-doctor` per vedere chi è collegato, oppure l'agent `selvans-scout` per la
  App Map dettagliata (quali app e come pilotarle).
