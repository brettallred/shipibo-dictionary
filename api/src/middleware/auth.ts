import { createMiddleware } from "hono/factory";
import { eq } from "drizzle-orm";
import { schema } from "../db";
import type { Env } from "../types";

export const sessionMiddleware = createMiddleware<Env>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    c.set("user", null);
    return next();
  }

  const sessionData = await c.env.SESSIONS.get(token, "json");
  if (!sessionData) {
    c.set("user", null);
    return next();
  }

  const { userId } = sessionData as { userId: number };
  const db = c.get("db");

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });

  c.set("user", user ?? null);
  await next();
});

export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

export const requireAdmin = createMiddleware<Env>(async (c, next) => {
  const user = c.get("user");
  if (!user || user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
});
