import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { schema } from "../db";
import { requireAuth } from "../middleware/auth";
import type { Env } from "../types";

const bookmarks = new Hono<Env>();

bookmarks.use("/*", requireAuth);

// Get all bookmarks
bookmarks.get("/", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");

  const items = await db.query.studyBookmarks.findMany({
    where: eq(schema.studyBookmarks.userId, user.id),
  });

  return c.json({ bookmarks: items });
});

// Create bookmark
bookmarks.post("/", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const body = await c.req.json();

  const [bookmark] = await db
    .insert(schema.studyBookmarks)
    .values({
      userId: user.id,
      type: body.type,
      icaroId: body.icaroId,
      stanzaIdx: body.stanzaIdx,
      phraseIdx: body.phraseIdx,
      entryId: body.entryId,
    })
    .returning();

  return c.json({ bookmark }, 201);
});

// Update comfort level
bookmarks.put("/:id", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();

  const existing = await db.query.studyBookmarks.findFirst({
    where: and(
      eq(schema.studyBookmarks.id, id),
      eq(schema.studyBookmarks.userId, user.id)
    ),
  });

  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  await db
    .update(schema.studyBookmarks)
    .set({
      comfort: body.comfort ?? existing.comfort,
      lastReviewedAt: new Date().toISOString(),
    })
    .where(eq(schema.studyBookmarks.id, id));

  return c.json({ ok: true });
});

// Delete bookmark
bookmarks.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const id = parseInt(c.req.param("id"));

  await db
    .delete(schema.studyBookmarks)
    .where(
      and(
        eq(schema.studyBookmarks.id, id),
        eq(schema.studyBookmarks.userId, user.id)
      )
    );

  return c.json({ ok: true });
});

export { bookmarks };
