import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { schema } from "../db";
import { requireAuth } from "../middleware/auth";
import type { Env } from "../types";

const progress = new Hono<Env>();

progress.use("/*", requireAuth);

// Get all user progress
progress.get("/", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");

  const items = await db.query.icaroProgress.findMany({
    where: eq(schema.icaroProgress.userId, user.id),
  });

  return c.json({ progress: items });
});

// Update progress for an icaro
progress.put("/:icaroId", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const icaroId = c.req.param("icaroId");
  const body = await c.req.json();

  const existing = await db.query.icaroProgress.findFirst({
    where: and(
      eq(schema.icaroProgress.userId, user.id),
      eq(schema.icaroProgress.icaroId, icaroId)
    ),
  });

  if (existing) {
    await db
      .update(schema.icaroProgress)
      .set({
        currentStanzaIdx: body.currentStanzaIdx ?? existing.currentStanzaIdx,
        currentPhraseIdx: body.currentPhraseIdx ?? existing.currentPhraseIdx,
        status: body.status ?? existing.status,
        lastAccessedAt: new Date().toISOString(),
      })
      .where(eq(schema.icaroProgress.id, existing.id));
  } else {
    await db.insert(schema.icaroProgress).values({
      userId: user.id,
      icaroId,
      currentStanzaIdx: body.currentStanzaIdx ?? 0,
      currentPhraseIdx: body.currentPhraseIdx,
      status: body.status ?? "active",
    });
  }

  const updated = await db.query.icaroProgress.findFirst({
    where: and(
      eq(schema.icaroProgress.userId, user.id),
      eq(schema.icaroProgress.icaroId, icaroId)
    ),
  });

  return c.json({ progress: updated });
});

// Delete progress for an icaro
progress.delete("/:icaroId", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const icaroId = c.req.param("icaroId");

  await db
    .delete(schema.icaroProgress)
    .where(
      and(
        eq(schema.icaroProgress.userId, user.id),
        eq(schema.icaroProgress.icaroId, icaroId)
      )
    );

  return c.json({ ok: true });
});

export { progress };
