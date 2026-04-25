#!/usr/bin/env bash
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "docker não encontrado."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose não encontrado."
  exit 1
fi

HOST_IPS="$(hostname -I 2>/dev/null | xargs || true)"

if [ -z "${HOST_IPS}" ]; then
  HOST_IPS="127.0.0.1"
fi

echo "IPs do host: ${HOST_IPS}"
echo
echo "Portas publicadas dos serviços:"
docker compose ps --format json | node -e '
const fs = require("node:fs");
const input = fs.readFileSync(0, "utf8").trim();
if (!input) {
  console.log("Nenhum container do compose em execução.");
  process.exit(0);
}
const lines = input.split("\n").filter(Boolean);
const rows = lines.map((line) => JSON.parse(line));
for (const row of rows) {
  const ports = row.Publishers?.length
    ? row.Publishers.map((p) => `${p.URL}:${p.PublishedPort}->${p.TargetPort}/${p.Protocol}`).join(", ")
    : "sem portas publicadas";
  console.log(`- ${row.Service}: ${ports}`);
}
'
