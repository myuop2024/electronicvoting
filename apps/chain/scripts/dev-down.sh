#!/usr/bin/env bash
set -euo pipefail

docker compose -f docker-compose.dev.yaml down -v
