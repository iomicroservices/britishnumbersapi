# Running the API Locally

This project runs on **Cloudflare Pages** with **Pages Functions**. The code already uses `context.env` for configuration; you only need to provide those values locally and run the dev server.

## 1. Prerequisites

- **Node.js** (v18+)
- **Wrangler** (run via `npx`, no install required)

## 2. Local-only Wrangler config

Production uses Cloudflare Dashboard config. For local dev, Wrangler needs a `wrangler.toml` in the project root. **Do not commit `wrangler.toml`** — add it in `.gitignore` so it never affects production.

First-time setup (or after cloning):

```bash
cp wrangler.toml.example wrangler.toml
```

You only need to do this once per machine. Your local `wrangler.toml` is used only by `wrangler pages dev` and is never deployed.

## 3. Environment variables

Environment variables are **not** read from a `.env` file by the runtime. For local development, Cloudflare uses a file named **`.dev.vars`** (same dotenv-style format). Values from `.dev.vars` are injected into `context.env` when you run `npx wrangler pages dev`.

### Setup

1. Copy the example file:
   ```bash
   cp .dev.vars.example .dev.vars
   ```
2. Open `.dev.vars` and set each variable to your real environment variable values (from your Cloudflare Dashboard and/or other applications).
3. **Do not commit `.dev.vars`** — it is in `.gitignore`. Use it only on your machine.

### Variables used by the API

| Variable | Used by |
|----------|---------|
| `DATABASE_BASE_URL` | v2 mobile memorable, auth, vd |
| `DATABASE_API_KEY` | v2 mobile memorable, auth, vd |
| `TELEPHONE_BASE_URL` | v2 telephone endpoints |
| `TELEPHONE_API_KEY` | v2 telephone search |
| `VD_BASE_URL` | v2/mobile/vd |
| `PURCHASE_WEBHOOK_BASE_URL` | v1 & v2 purchase |
| `MEMORABLE_WEBHOOK_BASE_URL` | v1 memorable |

If you don’t have values yet (e.g. for telephone/VD), you can leave them empty; endpoints that need them will fail until you add the correct URLs/keys.

## 4. Run the API locally

From the project root:

```bash
npx wrangler pages dev
```

- Wrangler serves static assets from `./dist` (e.g. Swagger UI) and runs your **Functions** from the `functions/` directory.
- Default URL: **http://localhost:8788**
- Try the API, for example:
  - `http://localhost:8788/rest/v2/mobile/memorable?search=123`
  - Or open `http://localhost:8788` for the Swagger UI if it’s configured to point at the same origin.

## 5. Optional: use a different port

```bash
npx wrangler pages dev ./dist --port 3000
```

## 6. Production / deployed env vars

In production, the same variables are set in the **Cloudflare Dashboard**:

1. Open your Pages project.
2. **Settings** → **Environment variables** (and **Secrets** for sensitive values).
3. Add the same names and values you use in `.dev.vars`.

Your code does not need to change: it already uses `context.env.VARIABLE_NAME`; only the source of those values (`.dev.vars` locally, Dashboard in production) differs.

## Summary

| Step | Action |
|------|--------|
| 1 | Copy `wrangler.toml.example` to `wrangler.toml` (local only) |
| 2 | Copy `.dev.vars.example` to `.dev.vars` |
| 3 | Fill in real values in `.dev.vars` |
| 4 | Run `npx wrangler pages dev ./dist` |
| 5 | Use http://localhost:8788 to test the API |

No code changes are required to “use” env vars — they are already read from `context.env`; you only need to provide them via `.dev.vars` locally.