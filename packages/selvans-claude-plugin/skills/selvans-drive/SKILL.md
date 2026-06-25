---
name: selvans-drive
description: Come scoprire e pilotare app selvans (FE Angular + BE Python) via i tool MCP del Core. Usala quando devi navigare/cliccare/compilare una UI selvans o invocare operazioni di backend di un'app collegata al Core su :8080.
---

# selvans-drive — pilotare app selvans

selvans espone ogni app collegata al **Core** (`:8080`) come tool MCP **dinamici**, namespacati per app:

- **FE**: `mcp__selvans__<appId>__fe__{get_page_state, get_elements, navigate, click_element, form_input}`
- **BE**: `mcp__selvans__<appId>__be__<service>__<op>`

I tool sono **deferred**: non sono visibili finché non li carichi con `ToolSearch`. Gli app id non sono
mai cablati — si scoprono a runtime.

## 1. Pre-flight
Verifica che il Core risponda: `GET http://localhost:8080/health`. Se è giù, avvialo con
`/selvans:selvans-setup`. Se `apps_connected` è 0, avvisa: il Core è su ma non c'è nulla da pilotare.

## 2. Discovery
Carica gli schemi dei tool e ricava gli **app id**:

```
ToolSearch "mcp__selvans__"
```

Gli app id compaiono nei nomi dei tool (es. `selvans-angular-demo`, `demo-backend`). Per una mappa
distillata (app, tool, routes/targets, howto) usa l'agent `selvans-scout`.

## 3. Pilotare il FE (loop semantico)
1. `…__fe__get_page_state` → URL, titolo, testo visibile (dove sono).
2. `…__fe__get_elements` → elementi taggati `SelvansTarget` con i loro `id` (cosa posso toccare).
3. Agisci:
   - `…__fe__navigate` → cambia route;
   - `…__fe__click_element` → clicca per `targetId`;
   - `…__fe__form_input` → leggi/scrivi un campo per `targetId`.
4. **Verifica**: ri-chiama `get_page_state` / `get_elements` per confermare l'effetto.

Non indovinare i `targetId`: leggili sempre con `get_elements` prima di cliccare o compilare.

## 4. Pilotare il BE
Chiama direttamente l'operazione: `…__be__<service>__<op>` con i parametri dello schema (caricato via
`ToolSearch`). Esempio: `…__be__tasks__create { title, priority }`, poi `…__be__tasks__list` per verificare.

## 5. Riscontro visivo (opzionale)
Se serve far *vedere* la UI all'utente, apri la preview integrata (`Claude_Preview`) puntata sull'app FE
(es. `http://localhost:4200`) e fai uno screenshot dopo le azioni chiave. La preview **mostra**; i tool
selvans **agiscono**. Sono canali complementari.

## Regola d'oro
Dopo ogni azione che muta stato, **verifica** l'effetto (ri-leggi lo stato FE o interroga il BE) prima di
proseguire.
