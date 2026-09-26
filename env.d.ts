declare namespace Cloudflare {
  interface Env {
    FILES: R2Bucket;
    DB: D1Database;
    TBA_AUTH_KEY?: string;
    FIREBASE_WEB_API_KEY: string;
    FIREBASE_PROJECT_ID: string;
  }
}
