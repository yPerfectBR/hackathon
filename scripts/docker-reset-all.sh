#!/usr/bin/env bash
set -euo pipefail

PORTS=("${@:-3000 3001 8080 8088 27017}")

if ! command -v docker >/dev/null 2>&1; then
  echo "docker não encontrado no PATH."
  exit 1
fi

echo "Parando todos os containers..."
sudo docker stop $(sudo docker ps -q) 2>/dev/null || true

echo "Removendo todos os containers..."
sudo docker rm $(sudo docker ps -aq) 2>/dev/null || true

echo "Limpando imagens, volumes, redes e cache..."
sudo docker system prune -a --volumes -f

echo "Encerrando processos nas portas: ${PORTS[*]}"
for port in "${PORTS[@]}"; do
  sudo fuser -k "${port}/tcp" 2>/dev/null || true
done

echo "Estado atual do Docker:"
sudo docker ps -a || true

echo "Portas em uso (filtro padrão):"
sudo ss -ltnp | rg ":3000|:3001|:8080|:8088|:27017" || true

echo "Concluído."
