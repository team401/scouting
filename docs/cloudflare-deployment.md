# Cloudflare deployment

The application is a Cloudflare Worker served at `https://scout.team401.org`.
GitHub Actions builds every branch and pull request. Production deploys run on
pushes to `main`, or manually from the **Deploy to Cloudflare** workflow while a
feature branch is under review.

## One-time Cloudflare setup

Create these resources in the same Cloudflare account that manages
`team401.org`:

- A D1 database named `team401-scouting`.
- An R2 bucket named `team401-scouting-files`.
- An API token that can edit Workers, D1, R2, and Workers custom domains for the
  account and zone.

The Worker configuration claims `scout.team401.org` as a Cloudflare custom
domain during deployment. No `chatgpt.site` project is involved.

## GitHub production environment

Create a GitHub environment named `production`. Add these secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `BETTER_AUTH_SECRET` (generate a random value containing at least 32 bytes)

Add these environment variables:

- `CLOUDFLARE_D1_DATABASE_ID` (the UUID shown by `wrangler d1 list`)
- `CLOUDFLARE_R2_BUCKET_NAME` (`team401-scouting-files` unless renamed)

Add required reviewers to the environment if production deployments should
wait for approval. The deploy job applies all files in `drizzle/` before it
publishes the Worker.
