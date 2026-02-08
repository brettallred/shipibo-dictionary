import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { schema } from "../db";
import { requireAdmin } from "../middleware/auth";
import type { Env } from "../types";

const entries = new Hono<Env>();

// GET /api/entries — public, returns all dictionary entries
// Uses raw D1 SQL + manual JSON assembly to stay within Worker CPU limits for 5000+ entries
entries.get("/", async (c) => {
  const d1 = c.env.DB;
  const result = await d1.prepare("SELECT id, headword, part_of_speech, data FROM entries ORDER BY headword").all();

  // Build JSON string manually to avoid 5000+ JSON.parse calls
  const parts: string[] = ["["];
  for (let i = 0; i < result.results.length; i++) {
    const row = result.results[i] as { id: number; headword: string; part_of_speech: string | null; data: string };
    if (i > 0) parts.push(",");
    // The data column already contains JSON — splice it in directly
    parts.push(`{"id":${row.id},"headword":${JSON.stringify(row.headword)},"part_of_speech":${row.part_of_speech ? JSON.stringify(row.part_of_speech) : "null"},`);
    // Strip leading { from data and append (merges the objects)
    parts.push(row.data.slice(1));
  }
  parts.push("]");

  return c.newResponse(parts.join(""), 200, { "Content-Type": "application/json" });
});

// POST /api/entries/import — admin, bulk upsert from JSON array
entries.post("/import", requireAdmin, async (c) => {
  const db = c.get("db");
  const body = await c.req.json();

  if (!Array.isArray(body)) {
    return c.json({ error: "Expected JSON array" }, 400);
  }

  let imported = 0;
  let updated = 0;

  for (const item of body) {
    const id = item.id;
    const headword = item.headword;
    const partOfSpeech = item.part_of_speech || null;
    const { id: _id, headword: _hw, part_of_speech: _pos, ...rest } = item;
    const data = JSON.stringify(rest);

    const existing = await db.query.entries.findFirst({
      where: eq(schema.entries.id, id),
    });

    if (existing) {
      await db
        .update(schema.entries)
        .set({ headword, partOfSpeech, data, updatedAt: new Date().toISOString() })
        .where(eq(schema.entries.id, id));
      updated++;
    } else {
      await db.insert(schema.entries).values({ id, headword, partOfSpeech: partOfSpeech, data });
      imported++;
    }
  }

  return c.json({ imported, updated });
});

export { entries };
