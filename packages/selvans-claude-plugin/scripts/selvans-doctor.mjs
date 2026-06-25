#!/usr/bin/env node
/**
 * selvans-doctor.mjs — Diagnostica del Core selvans.
 *
 * Uso:
 *   node selvans-doctor.mjs              check singolo di <core>/health
 *   node selvans-doctor.mjs --wait       poll finché il Core è healthy (default 90s)
 *   node selvans-doctor.mjs --wait=120   poll con timeout custom (secondi)
 *   node selvans-doctor.mjs --json       output JSON grezzo (per consumo programmatico)
 *
 * Env:
 *   Selvans_CORE_URL   override dell'URL del Core (default http://localhost:8080)
 *
 * Exit code: 0 = Core raggiungibile, 1 = non raggiungibile (entro il timeout).
 *
 * Node puro, nessuna dipendenza. Il poll usa setTimeout (timer Node), non il
 * comando `sleep` della shell.
 */
import http from 'node:http';
import https from 'node:https';

const CORE_URL = (process.env.Selvans_CORE_URL || 'http://localhost:8080').replace(/\/$/, '');
const HEALTH = `${CORE_URL}/health`;

const argv = process.argv.slice(2);
const jsonOut = argv.includes('--json');
const waitArg = argv.find((a) => a === '--wait' || a.startsWith('--wait='));
const waitSec = waitArg ? parseInt(waitArg.split('=')[1], 10) || 90 : 0;

function getHealth() {
  return new Promise((resolve, reject) => {
    const lib = HEALTH.startsWith('https') ? https : http;
    const req = lib.get(HEALTH, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve({ status: 'ok', _raw: body });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(2500, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let health = null;
  const deadline = Date.now() + waitSec * 1000;

  for (;;) {
    try {
      health = await getHealth();
      break;
    } catch (e) {
      if (waitSec && Date.now() < deadline) {
        await sleep(2000);
        continue;
      }
      if (jsonOut) {
        console.log(JSON.stringify({ reachable: false, url: CORE_URL, error: e.message }));
      } else {
        console.error(`✗ Core NON raggiungibile su ${HEALTH} (${e.message}).`);
        console.error(`  → Avvia il Core con:  /selvans:selvans-setup`);
      }
      process.exit(1);
    }
  }

  const fe = health.frontends ?? 0;
  const be = health.backends ?? 0;
  const total = health.apps_connected ?? fe + be;

  if (jsonOut) {
    console.log(JSON.stringify({ reachable: true, url: CORE_URL, status: health.status ?? 'ok', fe, be, total }));
    process.exit(0);
  }

  console.log(`✓ Core raggiungibile su ${CORE_URL}  (status: ${health.status ?? 'ok'})`);
  console.log(`  App collegate: ${total}  →  frontend: ${fe}, backend: ${be}`);

  if (total === 0) {
    console.log('');
    console.log("⚠ Nessuna app collegata: il Core è su ma non c'è nulla da pilotare.");
    console.log(`  → Avvia le tue app selvans puntate a ${CORE_URL} (WS /Selvans/ws).`);
  } else {
    console.log('');
    console.log('Per scoprire app id e tool disponibili:');
    console.log('  • ToolSearch "mcp__selvans__"   (carica gli schemi dei tool FE/BE)');
    console.log('  • agent selvans-scout                  (App Map dettagliata + howto)');
  }

  console.log('');
  console.log(`Admin UI: ${CORE_URL}/ui   |   MCP SSE: ${CORE_URL}/mcp/sse`);
  process.exit(0);
}

main();
