---
description: Check veloce del Core selvans — raggiungibilità e numero di app FE/BE collegate.
allowed-tools: Bash
---

Esegui la diagnostica rapida del Core selvans:

```bash
node "$CLAUDE_PLUGIN_ROOT/scripts/selvans-doctor.mjs"
```

Riporta l'output all'utente in forma sintetica: Core su/giù, quante app collegate (FE/BE).

- Se il Core è **giù**, ricorda `/selvans:selvans-setup`.
- Se ci sono app collegate e l'utente vuole sapere *quali* sono e *come* usarle, proponi l'agent
  `selvans-scout` (produce la App Map dettagliata).
