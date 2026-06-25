@echo off
REM setup.bat — Wrapper Windows per selvans (Selvans-S3)
REM
REM Uso:
REM   scripts\setup.bat           — percorso dev (richiede Node+pnpm+Docker)
REM   scripts\setup.bat --docker  — percorso all-in-docker (richiede solo Docker)
REM
REM Il flag --docker avvia l'intero stack (Core + Python + Angular) via Docker
REM usando il profilo "full" del docker-compose.yml — nessun Node/pnpm necessario.

setlocal EnableDelayedExpansion

REM Individua la root del monorepo (directory padre di scripts\)
set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%.."

REM Parsing argomenti
set "DOCKER_ONLY=0"
for %%A in (%*) do (
  if "%%A"=="--docker" set "DOCKER_ONLY=1"
)

REM ─── check Docker daemon ────────────────────────────────────────────────────
echo.
echo ^> Verifica Docker daemon...
docker info >nul 2>&1
if errorlevel 1 (
  echo.
  echo X ERRORE: Docker non e' avviato o non e' raggiungibile.
  echo   Come risolvere: avvia Docker Desktop e riprova.
  exit /b 1
)
echo V Docker daemon raggiungibile

REM ─── check pnpm ─────────────────────────────────────────────────────────────
where pnpm >nul 2>&1
if errorlevel 1 (
  set "HAS_PNPM=0"
) else (
  set "HAS_PNPM=1"
)

REM ─── percorso all-in-docker ─────────────────────────────────────────────────
if "%DOCKER_ONLY%"=="1" goto :docker_path
if "%HAS_PNPM%"=="0" (
  echo.
  echo W pnpm non trovato nel PATH -- utilizzo percorso all-in-docker.
  echo   (Se vuoi il percorso dev, installa pnpm: npm install -g pnpm)
  goto :docker_path
)

REM ─── percorso dev ────────────────────────────────────────────────────────────
echo.
echo ^> Percorso dev (Node+pnpm+Docker^): delego a pnpm run setup...
echo.
cd /d "%REPO_ROOT%"
pnpm run setup
exit /b %errorlevel%

:docker_path
echo.
echo ^> Avvio stack completo via Docker (profilo full^)...
echo   Core + Python demo + Angular demo containerizzata su :4200
echo.
cd /d "%REPO_ROOT%"
docker compose --profile full up --build -d
if errorlevel 1 (
  echo.
  echo X ERRORE: docker compose ha restituito un errore.
  echo   Controlla che Docker sia avviato e che docker-compose.yml esista.
  exit /b 1
)
echo.
echo V Stack avviato.
echo.
echo URL dell'applicazione:
echo   Core admin UI  --  http://localhost:8080/ui
echo   Angular demo   --  http://localhost:4200  (richiede qualche secondo per nginx)
echo   Python demo    --  http://localhost:8001
echo.
echo   AI provider: configura in .env (vedi .env.example)
echo   Per fermare: docker compose --profile full down
exit /b 0
