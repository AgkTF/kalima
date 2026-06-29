# Kalima deployment — Ubuntu home server + PM2

This is the human runbook for issue #29. The configuration files
(`ecosystem.config.js`, `scripts/deploy.sh`) can be prepared ahead of time, but
**the actual deployment requires access to the home server** — this is a HITL
issue.

> Port `4001` is used to avoid conflicts with services already on the box
> (3000 range, 8080, 8088, 8096, 8888). Tailscale is already installed and
> configured, so no extra network setup is needed — anything reachable on the
> server's LAN IP or Tailscale IP on port 4001 is reachable remotely.

## Architecture (why one process)

- **One PM2 process** (`kalima`) runs the compiled Express server
  (`packages/server/dist/index.js`).
- The server serves the **tRPC API** at `/trpc`, the **built frontend** as
  static files from `packages/web/dist`, and an **SPA fallback** that serves
  `index.html` for any non-API route.
- The database is a **single SQLite file** — no separate DB process.

## Prerequisites (one-time, on the home server)

```bash
# Node.js (v20+) — use nvm or nodesource
# pnpm
npm install -g pnpm

# PM2
npm install -g pm2

# Log rotation module (only once, ever)
pm2 install pm2-logrotate
```

### Auto-start on boot

```bash
pm2 startup systemd
```

PM2 prints a command like `sudo env PATH=$PATH:... pm2 startup systemd -u <user> --hp <home>`.
**Run that printed command with `sudo`.** This installs a systemd unit that
resurrects the saved PM2 process list on boot. After your first successful
`pm2 start` + `pm2 save` (below), the app comes back on reboot automatically.

### Log rotation settings (recommended)

```bash
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## First deployment

### 1. Clone

```bash
git clone https://github.com/AgkTF/kalima.git
cd kalima
git checkout main   # or the branch/commit you intend to deploy
```

### 2. Create the production environment file

`packages/server/.env` is **gitignored** (it holds secrets). Copy the example
and fill it in:

```bash
cp packages/server/.env.example packages/server/.env
$EDITOR packages/server/.env
```

Required values:

| Var | Example | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `file:./prisma/prod.db` | SQLite path (relative to `packages/server`). A fresh clone has **no** `*.db` files — `prisma migrate deploy` creates it empty. Do **not** copy `dev.db` from a dev machine. |
| `LLM_API_KEY` | `...` | Your OpenAI-compatible API key. |
| `LLM_BASE_URL` | `https://api.deepinfra.com/v1/openai` | |
| `LLM_CHEAP_MODEL` | `Qwen/...` | |
| `LLM_PREMIUM_MODEL` | `google/...` | |
| `PORT` | _(leave out)_ | Enforced to `4001` by `ecosystem.config.js`. If you set it, use `4001`. |

> `dotenv` does not override existing process env vars, so PM2's `PORT=4001`
> from the ecosystem file always wins — safe even if `.env` still says `3001`.

### 3. Deploy

```bash
./scripts/deploy.sh
```

This runs, in order:

1. `pnpm install --frozen-lockfile`
2. `prisma migrate deploy` — applies all migrations to the **fresh** DB.
3. `prisma generate` — generates the Prisma client into `src/generated/prisma/`
   (gitignored). Required by the `tsc` build; `migrate deploy` does **not** do
   this automatically, so on a fresh clone it must run explicitly.
4. `pnpm --filter server build` — `tsc` compiles `src/` → `dist/`.
5. `pnpm --filter web build` — Vite builds `packages/web/dist/`.
6. `pm2 start ecosystem.config.js` (or `pm2 restart kalima` if already running)
7. `pm2 save` — persists the process list so it resurrects on reboot.

The script refuses to start if `packages/server/.env` is missing, and restarts
the existing process instead of creating a duplicate on re-runs.

> **Fresh database guarantee:** the deploy never carries dev data. The only DB
> that exists on the server is the one `prisma migrate deploy` creates from
> migrations — empty on first deploy.

### 4. Verify

```bash
# Locally on the server
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:4001/

# From another machine on the LAN (replace with the server's LAN IP)
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' http://<server-lan-ip>:4001/

# Over Tailscale (replace with the server's Tailscale IP)
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' http://<server-tailscale-ip>:4001/

pm2 status
pm2 logs kalima --lines 20
```

All three should return `HTTP 200`. The SPA fallback serves `index.html` for
any non-`/trpc` path, so unknown routes also return `200` (the React app handles
client-side routing).

> If the LAN/Tailscale URL fails but `localhost:4001` works, check the firewall:
> `sudo ufw allow 4001/tcp` (or whatever firewall you use).

## Updating the app (re-deploy)

```bash
cd kalima
git pull
./scripts/deploy.sh      # reinstall -> migrate -> rebuild -> pm2 restart kalima -> save
```

`pm2 restart kalima` picks up the freshly built `dist/` with near-zero downtime.

## Day-to-day PM2 commands

```bash
pm2 status                 # process table
pm2 logs kalima            # live logs (Ctrl-C to detach)
pm2 logs kalima --lines 50 # last 50 lines
pm2 restart kalima         # manual restart
pm2 stop kalima            # stop (process stays in the list)
pm2 delete kalima          # remove from the list entirely
pm2 monit                  # live CPU/memory terminal UI
```

## Troubleshooting

- **`prisma migrate deploy` fails / client missing:** `migrate deploy` applies
  migrations but does **not** generate the Prisma client. The deploy script runs
  `prisma generate` right after; if you skip it, the `tsc` build fails on the
  `./generated/prisma/client.js` import. The client dir is gitignored, so on a
  fresh clone it only exists once `prisma generate` has run.
- **`dist/index.js` not found:** the build step must run after `prisma generate`
  (which creates the gitignored Prisma client) and `prisma migrate deploy`. The
  deploy script enforces this order.
- **Frontend 404s after deploy:** confirm `packages/web/dist/index.html` exists
  (`pnpm --filter web build`). The server looks for it at
  `../../web/dist` relative to `packages/server/dist`.
- **Process not coming back after reboot:** you forgot `pm2 save`, or the
  `pm2 startup systemd` generated command wasn't run with `sudo`.
- **Using dev data by accident:** the script warns if `DATABASE_URL` still
  points at `dev.db`. Use a dedicated `prod.db` path in production `.env`.

## Files this issue adds

| File | Purpose |
| --- | --- |
| `ecosystem.config.js` | PM2 process declaration (name `kalima`, cwd `packages/server`, script `dist/index.js`, `PORT=4001`) |
| `scripts/deploy.sh` | Idempotent deploy script (install → migrate → build → pm2) |
| `docs/deployment.md` | This runbook |