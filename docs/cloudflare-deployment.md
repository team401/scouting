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
- An API token with Account / Workers / Admin, Account / D1 / Edit, and Zone /
  Workers Routes / Edit for the `team401.org` zone. Workers Admin is needed to
  create the Worker during its first deployment; it can be reduced to Edit
  afterward.

The Worker configuration claims `scout.team401.org` as a Cloudflare custom
domain during deployment. Remove any existing CNAME for that exact hostname
before the first deployment.

## GitHub production environment

Create a GitHub environment named `production`. Add these secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `BETTER_AUTH_SECRET` (generate with `npx auth@latest secret`)

Add these environment variables:

- `CLOUDFLARE_D1_DATABASE_ID` (the UUID shown by `wrangler d1 list`)
- `CLOUDFLARE_R2_BUCKET_NAME` (`team401-scouting-files` unless renamed)

Add required reviewers to the environment if production deployments should
wait for approval. The deploy job applies all files in `drizzle/` before it
publishes the Worker. It writes the authentication secret to an ephemeral file
on the GitHub-hosted runner and passes that file to Wrangler so the initial
Worker deployment and secret binding happen together. The runner is discarded
after the job; the secret is never written to the repository.
