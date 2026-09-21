# Cloudflare deployment

The application uses two isolated Cloudflare environments:

| Environment | Branch    | Deployment                    | Worker                     | URL                                 |
| ----------- | --------- | ----------------------------- | -------------------------- | ----------------------------------- |
| Staging     | `staging` | Automatic after every push    | `team401-scouting-staging` | `https://staging.scout.team401.org` |
| Production  | `main`    | Manual workflow dispatch only | `team401-scouting`         | `https://scout.team401.org`         |

Each environment has its own D1 database, R2 bucket, and Better Auth secret so
test accounts and scouting data cannot affect production.

## Release flow

1. Open feature pull requests against `staging`.
2. Merge after review; the staging deployment runs automatically.
3. Test the change at `staging.scout.team401.org`.
4. Open a pull request from `staging` into `main`.
5. Merge the approved release.
6. Manually run **Deploy Production** from the `main` branch.

The production workflow refuses to deploy any ref other than `main`. Configure
the GitHub `production` environment to allow deployments from `main` only and
add required reviewers if a second approval is desired.

## Cloudflare resources

Create these resources in the same Cloudflare account that manages
`team401.org`:

- Production D1: `team401-scouting`
- Production R2: `team401-scouting-files`
- Staging D1: `team401-scouting-staging`
- Staging R2: `team401-scouting-files-staging`

The deployment token needs Account / Workers / Admin, Account / D1 / Edit,
Account / Workers R2 Storage / Edit, and Zone / Workers Routes / Edit for the
`team401.org` zone. Workers Admin is needed to create both Workers during their
first deployments; it can be reduced to Edit afterward.

The workflows create the Worker custom domains. Remove any existing CNAME for
either exact hostname before its first deployment.

## GitHub environments

Create GitHub environments named `staging` and `production`. Add the following
secrets to each environment:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `BETTER_AUTH_SECRET` (generate a different value for each environment with
  `npx auth@latest secret`)
- `TBA_AUTH_KEY` (a read API key from your The Blue Alliance account; this may
  be shared between environments)
- `TBA_WEBHOOK_SECRET` (a long random value used only to authenticate webhook
  deliveries; use a different value in staging and production)
- `RESEND_API_KEY` (a Resend send-only key restricted to the verified sending
  domain)
- `EMAIL_FROM` (for example `Team 401 Scouting <scouting@team401.org>`)
  Add these environment variables with values for that environment:

- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_R2_BUCKET_NAME`

Use `team401-scouting-files-staging` for the staging R2 variable and
`team401-scouting-files` for production. Restrict the `staging` environment to
the `staging` branch and `production` to `main`.

The first account in a new database becomes the Team 401 owner. That owner
must set the team invite code under **Admin → Team and event** before anyone
else can create an account. The code is hashed in D1, can be rotated without a
deployment, and should be different between staging and production.

## The Blue Alliance webhook

After deploying, create a webhook from your TBA account dashboard. Use
`https://staging.scout.team401.org/api/tba-webhook` for staging or
`https://scout.team401.org/api/tba-webhook` for production, and enter the same
random value stored in that environment's `TBA_WEBHOOK_SECRET`. Enable match
score and schedule notifications. TBA sends a verification delivery first;
after clicking **Resend code** in TBA, retrieve the latest code from **Admin →
Team and event → TBA webhook verification** in the scouting app, then enter it
back in TBA. The webhook accelerates updates, while the existing client polling
remains the fallback if a delivery is delayed or missed.

## Account email

Password reset and account verification use Resend's HTTPS email API from the
Worker. Add and verify `team401.org` (or a dedicated sending subdomain) in
Resend, publish the SPF and DKIM records it provides in Cloudflare DNS, then
create a send-only API key restricted to that domain. Add `RESEND_API_KEY` and
`EMAIL_FROM` to both GitHub environments before merging this feature; deploys
intentionally fail if either is absent. Existing accounts are marked verified
by migration `0006`; new accounts must verify their email before signing in.

Each deploy applies the D1 migrations before publishing. Authentication secrets
are written to an ephemeral file on the GitHub-hosted runner and sent to
Wrangler with the Worker deployment; they are never committed to the repository.
