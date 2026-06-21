/**
 * PM2 process configuration for Kalima.
 *
 * Start:          pm2 start ecosystem.config.js
 * Restart:        pm2 restart kalima
 * Stop:           pm2 stop kalima
 * Logs:           pm2 logs kalima
 * Save process list (survives reboot once `pm2 startup` is set up):
 *                pm2 save
 *
 * Only ONE process is needed: the Express server serves the compiled tRPC API
 * and the built frontend static files (with SPA fallback) from a single Node
 * process. The database is a single SQLite file — no separate DB process.
 *
 * Environment:
 *   PORT and NODE_ENV are set below (authoritative — dotenv does not override
 *   existing process env vars, so these win over anything in .env).
 *   Everything else (DATABASE_URL, LLM_API_KEY, LLM_BASE_URL, LLM_*_MODEL) is
 *   read from packages/server/.env by dotenv at startup. See docs/deployment.md
 *   for how to create that file on a fresh server.
 *
 * Full runbook: docs/deployment.md
 */
module.exports = {
  apps: [
    {
      name: "kalima",
      // Resolve relative to this file, i.e. <repo>/packages/server
      cwd: "./packages/server",
      // Compiled output of `pnpm --filter server build` (tsc: src/ -> dist/)
      script: "dist/index.js",

      // SQLite is a single file — fork mode, one instance. No clustering.
      exec_mode: "fork",
      instances: 1,

      // Auto-restart on crash (pm2 default, made explicit).
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      // Back off between restarts so a crash loop doesn't hammer the box.
      exp_backoff_restart_delay: 200,

      // Never restart on file changes in production.
      watch: false,

      env: {
        NODE_ENV: "production",
        PORT: 4001,
      },

      // Use pm2's default log location (~/.pm2/logs/) so pm2-logrotate manages
      // rotation out of the box. Timestamp every line for easier triage.
      time: true,
    },
  ],
};