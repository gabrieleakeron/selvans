#!/usr/bin/env bash
# setup.sh — Wrapper cross-OS per selvans (Selvans-S3)
#
# Uso:
#   ./scripts/setup.sh           # percorso dev (richiede Node+pnpm+Docker)
#   ./scripts/setup.sh --docker  # percorso all-in-docker (richiede solo Docker)
#
# Il flag --docker avvia l'intero stack (Core + Python + Angular) via Docker
# usando il profilo "full" del docker-compose.yml — nessun Node/pnpm necessario.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DOCKER_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --docker) DOCKER_ONLY=true ;;
  esac
done

# ─── check Docker daemon ─────────────────────────────────────────────────────
echo ""
echo "→ Verifica Docker daemon..."
if ! docker info > /dev/null 2>&1; then
  echo ""
  echo "✗ ERRORE: Docker non è avviato o non è raggiungibile."
  echo "  Come risolvere: avvia Docker Desktop (o il daemon Docker) e riprova."
  exit 1
fi
echo "✓ Docker daemon raggiungibile"

# ─── percorso all-in-docker (--docker o pnpm assente) ────────────────────────
if $DOCKER_ONLY || ! command -v pnpm > /dev/null 2>&1; then
  if ! command -v pnpm > /dev/null 2>&1; then
    echo ""
    echo "⚠  pnpm non trovato nel PATH — utilizzo percorso all-in-docker."
    echo "   (Se vuoi il percorso dev, installa pnpm: npm install -g pnpm)"
  fi
  echo ""
  echo "→ Avvio stack completo via Docker (profilo full)..."
  echo "  Core + Python demo + Angular demo containerizzata su :4200"
  echo ""
  docker compose --profile full up --build -d
  echo ""
  echo "✓ Stack avviato."
  echo ""
  echo "URL dell'applicazione:"
  echo "  Core admin UI  →  http://localhost:8080/ui"
  echo "  Angular demo   →  http://localhost:4200  (richiede qualche secondo per nginx)"
  echo "  Python demo    →  http://localhost:8001"
  echo ""
  echo "  AI provider: configura in .env (vedi .env.example)"
  echo "  Per fermare: docker compose --profile full down"
  exit 0
fi

# ─── percorso dev (Node + pnpm + Docker) ─────────────────────────────────────
echo ""
echo "→ Percorso dev (Node+pnpm+Docker): delego a pnpm run setup..."
echo ""
cd "$REPO_ROOT"
exec pnpm run setup
