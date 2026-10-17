import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig, loadEnv } from 'vite';

const LOCAL_D1_DATABASE_ID = '00000000-0000-4000-8000-000000000000';
const STAGING_D1_DATABASE_ID = 'd030411e-1ed8-4209-99c5-f625ab02a6a2';
const VINEXT_PREFETCH_QUEUE =
  'vinext/dist/shims/internal/app-prefetch-fetch-queue.js';
export default defineConfig(async ({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const environment = { ...fileEnv, ...process.env };
  const customDomain = environment.CLOUDFLARE_CUSTOM_DOMAIN;
  const useRemoteBindings = mode === 'staging';
  const localBindingConfig = {
    name:
      environment.CLOUDFLARE_WORKER_NAME ??
      (useRemoteBindings
        ? 'team401-scouting-staging'
        : 'team401-scouting-local'),
    main: './worker.ts',
    compatibility_date: '2026-05-15',
    compatibility_flags: ['nodejs_compat'],
    routes: customDomain
      ? [{ pattern: customDomain, custom_domain: true }]
      : [],
    vars: {
      FIREBASE_WEB_API_KEY: environment.FIREBASE_WEB_API_KEY ?? '',
      FIREBASE_PROJECT_ID: environment.FIREBASE_PROJECT_ID ?? '',
    },
    d1_databases: [
      {
        binding: 'DB',
        database_name:
          environment.CLOUDFLARE_D1_DATABASE_NAME ??
          (useRemoteBindings
            ? 'team401-scouting-staging'
            : 'team401-scouting-local'),
        database_id:
          environment.CLOUDFLARE_D1_DATABASE_ID ??
          (useRemoteBindings ? STAGING_D1_DATABASE_ID : LOCAL_D1_DATABASE_ID),
        migrations_dir: 'drizzle',
        remote: useRemoteBindings,
      },
    ],
    r2_buckets: [
      {
        binding: 'FILES',
        bucket_name:
          environment.CLOUDFLARE_R2_BUCKET_NAME ??
          'team401-scouting-files-local',
      },
    ],
    triggers: {
      crons: ['* * * * *'],
    },
    observability: {
      enabled: true,
      redact_query_string: true,
      issues: { enabled: true },
      logs: {
        enabled: true,
        invocation_logs: true,
        head_sampling_rate: 1,
        persist: true,
      },
      traces: {
        enabled: true,
        head_sampling_rate: 0.1,
        persist: true,
      },
    },
  };
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler captures its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    optimizeDeps: {
      exclude: [VINEXT_PREFETCH_QUEUE],
    },
    environments: {
      rsc: {
        optimizeDeps: {
          exclude: [VINEXT_PREFETCH_QUEUE],
        },
      },
    },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      }),
    ],
  };
});
