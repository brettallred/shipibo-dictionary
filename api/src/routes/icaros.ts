import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { schema } from "../db";
import { requireAdmin } from "../middleware/auth";
import type { Env } from "../types";

const icaros = new Hono<Env>();

// GET /api/icaros — public, returns all icaros
icaros.get("/", async (c) => {
  const db = c.get("db");
  const rows = await db.query.icaros.findMany({
    orderBy: (ic, { asc }) => [asc(ic.id)],
  });

  const items = rows.map((row) => {
    const data = JSON.parse(row.data);
    return { id: row.id, title: row.title, ...data };
  });

  return c.json(items);
});

// GET /api/icaros/:id — public, single icaro
icaros.get("/:id", async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  const row = await db.query.icaros.findFirst({
    where: eq(schema.icaros.id, id),
  });

  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }

  const data = JSON.parse(row.data);
  return c.json({ id: row.id, title: row.title, ...data });
});

// POST /api/icaros/import — admin, bulk upsert from JSON array
icaros.post("/import", requireAdmin, async (c) => {
  const db = c.get("db");
  const body = await c.req.json();

  if (!Array.isArray(body)) {
    return c.json({ error: "Expected JSON array" }, 400);
  }

  let imported = 0;
  let updated = 0;

  for (const item of body) {
    const id = String(item.id);
    const title = item.title;
    const { id: _id, title: _title, ...rest } = item;
    const data = JSON.stringify(rest);

    const existing = await db.query.icaros.findFirst({
      where: eq(schema.icaros.id, id),
    });

    if (existing) {
      await db
        .update(schema.icaros)
        .set({ title, data, updatedAt: new Date().toISOString() })
        .where(eq(schema.icaros.id, id));
      updated++;
    } else {
      await db.insert(schema.icaros).values({
        id,
        title,
        source: "imported",
        data,
      });
      imported++;
    }
  }

  return c.json({ imported, updated });
});

// DELETE /api/icaros/:id — admin, remove icaro
icaros.delete("/:id", requireAdmin, async (c) => {
  const db = c.get("db");
  const id = c.req.param("id");

  await db.delete(schema.icaros).where(eq(schema.icaros.id, id));
  return c.json({ ok: true });
});

export { icaros };
