declare namespace Cloudflare {
  interface Env {
    FILES: R2Bucket;
    DB: D1Database;
    TBA_AUTH_KEY?: string;
    FRC_EVENTS_USERNAME?: string;
    FRC_EVENTS_AUTH_KEY?: string;
    MATCH13_API_KEY?: string;
    FIREBASE_WEB_API_KEY: string;
    FIREBASE_PROJECT_ID: string;
  }
}
