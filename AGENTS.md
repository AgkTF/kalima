<!-- intent-skills:start -->
# Skill mappings - load with `npx @tanstack/intent@latest load <use>`.
skills:
  - when: "Setting up tRPC client, links, or React Query integration"
    use: "@trpc/client#client-setup"
  - when: "Mounting tRPC on Express or configuring createContext with req/res"
    use: "@trpc/server#adapter-express"
  - when: "Initializing tRPC, defining routers, procedures, context, or merging routers"
    use: "@trpc/server#server-setup"
  - when: "Calling tRPC procedures directly from server code or in tests"
    use: "@trpc/server#server-side-calls"
  - when: "Configuring input/output validation with Zod or other validators"
    use: "@trpc/server#validators"
  - when: "tRPC error handling, TRPCError, or errorFormatter"
    use: "@trpc/server#error-handling"
  - when: "Creating or composing tRPC middleware"
    use: "@trpc/server#middlewares"
  - when: "Configuring .env files or environment variables"
    use: "dotenv#dotenv"
<!-- intent-skills:end -->

## Agent skills

### Issue tracker

GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at repo root + `docs/adr/`. See `docs/agents/domain.md`.

When working on screen files (`packages/web/src/screens/`), always read `docs/adr/0006-screen-files-as-thin-orchestrators.md` first. Screen files are thin orchestrators; sub-components, utilities, and types live in sibling files.