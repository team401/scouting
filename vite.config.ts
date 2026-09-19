import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';

const LOCAL_D1_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  name: 'team401-scouting',
  main: 'vinext/server/fetch-handler',
  compatibility_date: '2026-05-15',
  compatibility_flags: ['nodejs_compat'],
  routes: [{ pattern: 'scout.team401.org', custom_domain: true }],
  vars: { BETTER_AUTH_URL: 'https://scout.team401.org' },
  d1_databases: [
    {
      binding: 'DB',
      database_name: 'team401-scouting',
      database_id:
        process.env.CLOUDFLARE_D1_DATABASE_ID ?? LOCAL_D1_DATABASE_ID,
      migrations_dir: '../../drizzle',
    },
  ],
  r2_buckets: [
    {
      binding: 'FILES',
      bucket_name:
        process.env.CLOUDFLARE_R2_BUCKET_NAME ?? 'team401-scouting-files',
    },
  ],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});
