#!/usr/bin/env bash
# scripts/deploy.sh — Kalima production deploy on an Ubuntu home server.
#
# Prereqs (one-time, see docs/deployment.md):
#   - Node.js, pnpm, pm2 installed globally
#   - pm2-logrotate installed:  pm2 install pm2-logrotate
#   - pm2 startup configured:    pm2 startup systemd  (then run the printed command with sudo)
#   - packages/server/.env created from .env.example with real LLM_API_KEY etc.
#
# This script is idempotent: safe to re-run for updates. It never carries over
# dev data — the SQLite file only exists after `prisma migrate deploy` creates it
# fresh on first deploy.
#
# Usage:
#   scripts/deploy.sh             # full deploy (install -> migrate -> build -> start)
#   scripts/deploy.sh --no-start  # everything except starting pm2 (useful before first pm2 setup)
#
# Run from the repository root, on the branch you intend to deploy (usually `main`).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

START_PM2=1
if [[ "${1:-}" == "--no-start" ]]; then START_PM2=0; fi

SERVER_DIR="$REPO_ROOT/packages/server"
ENV_FILE="$SERVER_DIR/.env"
ENV_EXAMPLE="$SERVER_DIR/.env.example"

log() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
err() { printf '\n\033[1;31m✖ %s\033[0m\n' "$*" >&2; }

# --- guards ------------------------------------------------------------------
command -v pnpm >/dev/null || { err "pnpm not found. Install: npm i -g pnpm"; exit 1; }
if [[ $START_PM2 -eq 1 ]]; then
  command -v pm2 >/dev/null || { err "pm2 not found. Install: npm i -g pm2"; exit 1; }
fi

# A .env with real secrets must exist before we start the app. We do NOT
# auto-generate secrets. On a fresh server, copy .env.example -> .env and fill it
# in first (see docs/deployment.md).
if [[ ! -f "$ENV_FILE" ]]; then
  err "Missing $ENV_FILE"
  echo "  Copy the example and fill in production values first:"
  echo "    cp $ENV_EXAMPLE $ENV_FILE"
  echo "  At minimum set DATABASE_URL, LLM_API_KEY, LLM_BASE_URL."
  echo "  PORT is enforced to 4001 by ecosystem.config.js; you may leave it out of .env."
  exit 1
fi

# Make sure DATABASE_URL points at a production database, not the dev one, to
# avoid silently using dev data. We only warn (don't hard-fail) so a fresh clone
# whose .env was copied from .env.example is still OK — the dev.db file does not
# exist on a fresh clone, so migrate deploy creates it empty.
if grep -q '^DATABASE_URL=file:./prisma/dev.db' "$ENV_FILE"; then
  echo "  ⚠  DATABASE_URL still points at prisma/dev.db."
  echo "     That's fine for a fresh clone (the file is gitignored and won't exist),"
  echo "     but consider a dedicated prod path, e.g. file:./prisma/prod.db"
fi

# --- 1. install dependencies -------------------------------------------------
log "Installing dependencies (pnpm install)"
pnpm install --frozen-lockfile

# --- 2. apply migrations + generate Prisma client -----------------------------
# `prisma migrate deploy` applies all pending migrations to the (fresh) SQLite
# file and generates the Prisma client into src/generated/prisma (gitignored).
# The generated client is required by the `tsc` build step that follows.
log "Applying Prisma migrations (fresh DB on first deploy)"
( cd "$SERVER_DIR" && pnpm exec prisma migrate deploy )

# --- 3. build server (tsc: src/ -> dist/) -------------------------------------
log "Building server (pnpm --filter server build)"
pnpm --filter server build

# --- 4. build frontend (vite -> packages/web/dist) ---------------------------
log "Building frontend (pnpm --filter web build)"
pnpm --filter web build

# --- 5. start / restart with pm2 ---------------------------------------------
if [[ $START_PM2 -eq 1 ]]; then
  log "Starting with pm2 (ecosystem.config.js)"
  if pm2 describe kalima >/dev/null 2>&1; then
    # Already managed by pm2 — restart picks up the freshly built dist/.
    pm2 restart kalima
  else
    pm2 start ecosystem.config.js
  fi
  pm2 save
  echo
  pm2 status
  echo
  echo "  ✅ Kalima should be up. Verify:"
  echo "     curl -sS -o /dev/null -w 'HTTP %{http_code}\\n' http://localhost:4001/"
else
  log "Skipping pm2 start (--no-start). Start manually with: pm2 start ecosystem.config.js"
fi