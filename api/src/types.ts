import { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./db/schema";

export type Env = {
  Bindings: {
    DB: D1Database;
    SESSIONS: KVNamespace;
    AUDIO_BUCKET: R2Bucket;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    SESSION_SECRET: string;
    ENVIRONMENT: string;
    APP_URL: string;
    ANTHROPIC_API_KEY: string;
    DISABLE_AUTH?: string;
  };
  Variables: {
    db: DrizzleD1Database<typeof schema>;
    user: typeof schema.users.$inferSelect | null;
  };
};
