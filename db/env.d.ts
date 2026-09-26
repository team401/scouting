declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    FILES: R2Bucket;
    TBA_AUTH_KEY?: string;
    TBA_WEBHOOK_SECRET?: string;
    FIREBASE_WEB_API_KEY: string;
    FIREBASE_PROJECT_ID: string;
  }
}
