import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { dbMiddleware } from "./middleware/db";
import { sessionMiddleware } from "./middleware/auth";
import { auth } from "./routes/auth";
import { progress } from "./routes/progress";
import { bookmarks } from "./routes/bookmarks";
import { feedbackRoutes } from "./routes/feedback";
import { audio } from "./routes/audio";
import { contributions } from "./routes/contributions";
import { chat } from "./routes/chat";
import { icaros } from "./routes/icaros";
import type { Env } from "./types";

const app = new Hono<Env>();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => origin, // Allow the requesting origin
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);
app.use("*", dbMiddleware);
app.use("*", sessionMiddleware);

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.route("/api/auth", auth);
app.route("/api/progress", progress);
app.route("/api/bookmarks", bookmarks);
app.route("/api/feedback", feedbackRoutes);
app.route("/api/audio", audio);
app.route("/api/contributions", contributions);
app.route("/api/chat", chat);
app.route("/api/icaros", icaros);

export default app;
