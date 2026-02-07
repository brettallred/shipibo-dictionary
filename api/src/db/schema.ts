import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const icaroProgress = sqliteTable("icaro_progress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  icaroId: text("icaro_id").notNull(),
  currentStanzaIdx: integer("current_stanza_idx").notNull().default(0),
  currentPhraseIdx: integer("current_phrase_idx"),
  status: text("status", { enum: ["active", "completed"] })
    .notNull()
    .default("active"),
  lastAccessedAt: text("last_accessed_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const studyBookmarks = sqliteTable("study_bookmarks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["stanza", "phrase", "word"] }).notNull(),
  icaroId: text("icaro_id"),
  stanzaIdx: integer("stanza_idx"),
  phraseIdx: integer("phrase_idx"),
  entryId: integer("entry_id"),
  comfort: text("comfort", {
    enum: ["new", "learning", "familiar", "mastered"],
  })
    .notNull()
    .default("new"),
  lastReviewedAt: text("last_reviewed_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const feedback = sqliteTable("feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetType: text("target_type", {
    enum: ["entry", "icaro", "phrase"],
  }).notNull(),
  targetId: text("target_id").notNull(),
  category: text("category", {
    enum: ["incorrect", "missing", "suggestion"],
  }).notNull(),
  message: text("message").notNull(),
  status: text("status", {
    enum: ["pending", "reviewed", "resolved", "dismissed"],
  })
    .notNull()
    .default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const audioRecordings = sqliteTable("audio_recordings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  icaroId: text("icaro_id").notNull(),
  uploadedBy: integer("uploaded_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  singerName: text("singer_name").notNull(),
  singerBio: text("singer_bio"),
  r2Key: text("r2_key").notNull(),
  durationSeconds: real("duration_seconds"),
  status: text("status", { enum: ["pending", "approved", "rejected"] })
    .notNull()
    .default("pending"),
  sortOrder: integer("sort_order"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const icaroContributions = sqliteTable("icaro_contributions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: text("status", {
    enum: ["draft", "submitted", "approved", "rejected"],
  })
    .notNull()
    .default("draft"),
  adminNotes: text("admin_notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});
