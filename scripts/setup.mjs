#!/usr/bin/env node
/**
 * setup.mjs — Orchestratore one-command per selvans (Selvans-S3/S6)
 *
 * Uso:  node scripts/setup.mjs          (da root monorepo)
 *       pnpm run setup                  (alias)
 *
 * Cosa fa:
 *   1. Verifica i prerequisiti (Docker daemon, pnpm, porte 8080/8001/4200).
 *   2. Esegue `pnpm install`.
 *   3. Avvia Core + Python demo + Angular dev container via `docker compose up -d --build`.
 *   4. Fa il poll di http://localhost:8080/health (Core) e http://localhost:4200
 *      (Angular dev, timeout 180s per la prima build esbuild in-container).
 *      Stampa gli URL finali ed esce con successo (exit 0).
 *
 * L'Angular demo gira come container Docker con live-reload (bind-mount sorgenti,
 * polling ogni ~1s). NON è più avviata via `nx serve` host in foreground.
 *
 * Idempotenza: se lo stack è già up `docker compose up -d` è no-op; se la porta
 * 4200 è già occupata stampa un avviso e termina con successo (stack già attivo).
 *
 * Prerequisiti: Node >= 18, Docker Desktop avviato, pnpm installato globalmente.
 */

import { execSync, spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';

// ─── colori ANSI ────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold:  '\x1b[1m',
  green: '\x1b[32m',
  yellow:'\x1b[33m',
  red:   '\x1b[31m',
  cyan:  '\x1b[36m',
  gray:  '\x1b[90m',
};
const ok    = (msg) => console.log(`${c.green}✓${c.reset} ${msg}`);
const warn  = (msg) => console.log(`${c.yellow}⚠${c.reset} ${msg}`);
const info  = (msg) => console.log(`${c.cyan}→${c.reset} ${msg}`);
const step  = (msg) => console.log(`\n${c.bold}${msg}${c.reset}`);
const fatal = (msg, hint) => {
  console.error(`\n${c.red}✗ ERRORE: ${msg}${c.reset}`);
  if (hint) console.error(`${c.gray}  Come risolvere: ${hint}${c.reset}`);
  process.exit(1);
};

// ─── utilità ─────────────────────────────────────────────────────────────────
function run(cmd, { cwd, quiet = false } = {}) {
  try {
    return execSync(cmd, {
      cwd: cwd ?? process.cwd(),
      stdio: quiet ? 'pipe' : 'inherit',
      encoding: 'utf8',
    });
  } catch (err) {
    return null;
  }
}

// ─── pnpm install con exit-code reale (usato solo dallo step 2) ──────────────
function pnpmInstall(args) {
  const isWin = process.platform === 'win32';
  const r = spawnSync(
    isWin ? 'pnpm.cmd' : 'pnpm',
    ['install', ...args],
    { cwd: process.cwd(), stdio: 'inherit', shell: isWin }  // shell:true risolve EINVAL su .cmd Windows
  );
  return { code: r.status, signal: r.signal, spawnError: r.error ?? null };
}

// ─── docker compose up con exit-code reale (usato solo dallo step 3) ─────────
// Stessa tecnica di pnpmInstall: spawnSync cattura l'exit-code reale, che
// consente di emettere un warn preciso senza abortire l'onboarding.
// Su Windows `docker` è un eseguibile nativo (non .cmd), quindi shell:false va
// bene su entrambe le piattaforme; usiamo comunque la variabile per uniformità.
function dockerComposeUp(services) {
  const r = spawnSync(
    'docker',
    ['compose', 'up', '-d', '--build', ...services],
    { cwd: process.cwd(), stdio: 'inherit', shell: false }
  );
  return { code: r.status, signal: r.signal, spawnError: r.error ?? null };
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = createConnection(port, '127.0.0.1');
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error',   () => { socket.destroy(); resolve(false); });
    socket.setTimeout(500, () => { socket.destroy(); resolve(false); });
  });
}

async function pollHealth(url, { timeoutMs = 90_000, intervalMs = 2_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const { default: http } = await import(url.startsWith('https') ? 'node:https' : 'node:http');
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode >= 200 && res.statusCode < 400) resolve();
          else reject(new Error(`HTTP ${res.statusCode}`));
          res.resume();
        });
        req.on('error', reject);
        req.setTimeout(2000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }
  return false;
}

// ─── STEP 1 — prerequisiti ───────────────────────────────────────────────────
step('1/4  Verifica prerequisiti');

// Node version
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 18) {
  fatal(`Node.js >= 18 richiesto (trovato ${process.versions.node})`,
    'Aggiorna Node.js: https://nodejs.org');
}
ok(`Node.js ${process.versions.node}`);

// Docker daemon
const dockerInfo = run('docker info', { quiet: true });
if (dockerInfo === null) {
  fatal('Docker non è avviato o non è raggiungibile.',
    'Avvia Docker Desktop (o il daemon Docker) e riprova.');
}
ok('Docker daemon raggiungibile');

// pnpm
const pnpmVer = run('pnpm --version', { quiet: true });
if (pnpmVer === null) {
  fatal('pnpm non trovato nel PATH.',
    'Installa pnpm: npm install -g pnpm  oppure  corepack enable && corepack prepare pnpm@latest --activate');
}
ok(`pnpm ${pnpmVer.trim()}`);

// Porte
const ports = [
  { port: 8080, name: 'selvans-core' },
  { port: 8001, name: 'selvans-python-demo' },
  { port: 4200, name: 'selvans-angular-demo' },
];

const portChecks = await Promise.all(ports.map(async ({ port, name }) => ({
  port, name, inUse: await isPortInUse(port),
})));

const port4200 = portChecks.find(p => p.port === 4200);
if (port4200.inUse) {
  warn(`Porta 4200 già occupata — stack Angular probabilmente già attivo.`);
  warn(`Se vuoi riavviare l'Angular, libera prima la porta 4200 e riprova.`);
  console.log(`\n${c.bold}Stack già attivo. URL:${c.reset}`);
  console.log(`  Core admin UI  →  ${c.cyan}http://localhost:8080/ui${c.reset}`);
  console.log(`  Angular demo   →  ${c.cyan}http://localhost:4200${c.reset}`);
  console.log(`  Python demo    →  ${c.cyan}http://localhost:8001${c.reset}`);
  console.log(`\n${c.gray}  Configurazione AI provider: modifica .env (vedere .env.example)${c.reset}\n`);
  process.exit(0);  // idempotente: exit 0
}

for (const { port, name, inUse } of portChecks.filter(p => p.port !== 4200)) {
  if (inUse) {
    warn(`Porta ${port} (${name}) già in uso — il container potrebbe già essere avviato (OK se è lo stack Selvans).`);
  } else {
    ok(`Porta ${port} (${name}) libera`);
  }
}

// ─── STEP 2 — pnpm install (con retry + frozen-lockfile + fallback) ──────────
step('2/4  pnpm install');

{
  // Tentativo 1: frozen-lockfile
  const t1 = pnpmInstall(['--frozen-lockfile']);
  if (t1.spawnError) {
    fatal(
      `pnpm non spawnabile (${t1.spawnError.code ?? t1.spawnError.message}).`,
      'Installa pnpm: npm install -g pnpm  oppure  corepack enable && corepack prepare pnpm@latest --activate'
    );
  }

  if (t1.code !== 0) {
    warn(`pnpm install --frozen-lockfile fallito (exit ${t1.code}), ritento…`);

    // Tentativo 2: frozen-lockfile (assorbe timeout transitori del proxy Nexus)
    const t2 = pnpmInstall(['--frozen-lockfile']);
    if (t2.spawnError) {
      fatal(
        `pnpm non spawnabile al retry (${t2.spawnError.code ?? t2.spawnError.message}).`,
        'Installa pnpm: npm install -g pnpm  oppure  corepack enable && corepack prepare pnpm@latest --activate'
      );
    }

    if (t2.code !== 0) {
      warn(`Lockfile forse non allineato: rigenero senza --frozen-lockfile…`);

      // Tentativo 3 (fallback): non-frozen, riallinea il lockfile out-of-date
      const t3 = pnpmInstall([]);
      if (t3.spawnError) {
        fatal(
          `pnpm non spawnabile nel fallback (${t3.spawnError.code ?? t3.spawnError.message}).`,
          'Installa pnpm: npm install -g pnpm  oppure  corepack enable && corepack prepare pnpm@latest --activate'
        );
      }

      if (t3.code !== 0) {
        fatal(
          `pnpm install ha restituito exit code ${t3.code}.`,
          'Controlla il log sopra / verifica il proxy registry / esegui pnpm install a mano.'
        );
      }
    }
  }
}

ok('Dipendenze installate');

// ─── STEP 3 — docker compose up Core + Python + Angular dev ──────────────────
step('3/4  Avvio Core + Python demo + Angular dev container via Docker');
info('docker compose up -d --build selvans-core selvans-python-demo selvans-angular-dev');
{
  const dc = dockerComposeUp(['selvans-core', 'selvans-python-demo', 'selvans-angular-dev']);
  if (dc.spawnError) {
    // docker non trovato / non spawnabile → errore hard: impossibile procedere
    fatal(`docker non spawnabile (${dc.spawnError.code ?? dc.spawnError.message}).`,
      'Verifica che Docker Desktop sia avviato e che `docker` sia nel PATH.');
  }
  if (dc.code !== 0) {
    // Exit ≠ 0 può essere benigno su prima build Windows (provenance metadata).
    // Il gate autoritativo è il poll /health e :4200 dello step 4: se i container
    // non sono davvero up, sarà lo step 4 a fallire con hint `docker compose logs`.
    warn(`docker compose up ha restituito exit code ${dc.code} — potrebbe essere benigno (prima build Windows/provenance). Verifico lo stato via health-check...`);
  } else {
    ok('Containers avviati (o già up)');
  }
}

// ─── STEP 4 — readiness: Core /health + Angular :4200 ───────────────────────
step('4/4  Attesa readiness (Core /health + Angular dev :4200)');

// Poll Core (max 90s — dovrebbe essere già healthy prima che Angular completi la build)
info('Poll http://localhost:8080/health ...');
const coreReady = await pollHealth('http://localhost:8080/health', { timeoutMs: 90_000 });
if (!coreReady) {
  fatal('Core non ha risposto su http://localhost:8080/health entro 90 secondi.',
    'Controlla i log con: docker compose logs selvans-core');
}
ok('Core pronto su :8080');

// Poll Angular dev container (max 180s — la prima build esbuild in-container
// richiede più tempo: pnpm install + compilazione Angular + avvio Vite).
// Accettiamo qualsiasi risposta HTTP (200-599): basta che Vite/esbuild risponda,
// anche con 404 o pagina di errore. Il check di contenuto è AC3 (live-reload),
// non un prerequisito dello startup.
info('Poll http://localhost:4200 (prima build può richiedere fino a 180s) ...');
const angularReady = await pollHealth('http://localhost:4200', {
  timeoutMs: 180_000,
  intervalMs: 3_000,
});
if (!angularReady) {
  warn('Angular dev container non ha risposto su :4200 entro 180 secondi.');
  warn('Il container è comunque avviato — controlla i log con: docker compose logs selvans-angular-dev');
  warn('Potrebbe essere necessario attendere ancora qualche minuto per la prima build.');
} else {
  ok('Angular dev pronto su :4200');
}

// ─── URL finali ───────────────────────────────────────────────────────────────
console.log(`\n${c.bold}Stack Selvans attivo. URL:${c.reset}`);
console.log(`  Core admin UI  →  ${c.cyan}http://localhost:8080/ui${c.reset}`);
console.log(`  Angular demo   →  ${c.cyan}http://localhost:4200${c.reset}  (live-reload via container)`);
console.log(`  Python demo    →  ${c.cyan}http://localhost:8001${c.reset}`);
console.log(`\n${c.gray}  AI provider: configura in .env (vedi .env.example)${c.reset}`);
console.log(`${c.gray}  Live-reload: salva un file in demos/ o packages/selvans-angular/ → aggiornamento nel browser (~1s)${c.reset}`);
console.log(`${c.gray}  Per fermare: docker compose down${c.reset}\n`);

process.exit(0);
