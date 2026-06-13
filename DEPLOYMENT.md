# Deployment

## Staging

Push-triggered deploys should publish the default Worker from `wrangler.toml`.
The Worker name is `sententia`, so the staging Workers URL should be:

```text
https://sententia-staging.jamiekozminska.workers.dev
```

The staging deploy command is:

```bash
npm run deploy
```

`npm run deploy` intentionally aliases `npm run deploy:staging`.

## Production

Production deploys to `sententia.tv` are manual only and publish a separate
Worker named `sententia`:

```bash
npm run deploy:production
```

Preview the production deploy without publishing:

```bash
npm run deploy:production:dry-run
```

Keep `sententia.tv` out of the default `wrangler.toml` routes/domains so push-triggered deploys do not publish to production. The staging deploy uses `--keep-vars` so dashboard-managed environment variables are not removed by Wrangler.

## Auth + D1 (local)

1. Copy `.env.example` secrets into `.dev.vars` (at minimum `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`).
2. Optionally set `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` for the Vite client.
3. Create D1 and update `database_id` placeholders in `wrangler.toml`:

```bash
npx wrangler d1 create sententia-staging
# paste id into wrangler.toml [[d1_databases]].database_id

npx wrangler d1 create sententia --env production
# paste id into [env.production.d1_databases].database_id
```

4. Apply migrations locally and run the app:

```bash
npx wrangler d1 migrations apply sententia-staging --local
npm run dev
```

5. Apply migrations to remote staging before deploy:

```bash
npx wrangler d1 migrations apply sententia-staging --remote
npm run deploy
```

Production:

```bash
npx wrangler d1 migrations apply sententia --remote --env production
npm run deploy:production
```

Required Worker vars: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY` (and existing OpenAI/TMDB/Turnstile secrets as needed).
