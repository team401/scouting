declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    FILES: R2Bucket;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    TBA_AUTH_KEY?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
  }
}
