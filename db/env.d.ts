declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    FILES: R2Bucket;
    TBA_AUTH_KEY?: string;
    FRC_EVENTS_USERNAME?: string;
    FRC_EVENTS_AUTH_KEY?: string;
    MATCH13_API_KEY?: string;
    TBA_WEBHOOK_SECRET?: string;
    FIREBASE_WEB_API_KEY: string;
    FIREBASE_PROJECT_ID: string;
  }
}
