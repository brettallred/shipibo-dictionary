import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { schema } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";
import type { Env } from "../types";

const contributions = new Hono<Env>();

contributions.use("/*", requireAuth);

// List user's contributions
contributions.get("/", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");

  const items = await db.query.icaroContributions.findMany({
    where: eq(schema.icaroContributions.userId, user.id),
    orderBy: (ic, { desc }) => [desc(ic.updatedAt)],
  });

  return c.json({ contributions: items });
});

// Create contribution
contributions.post("/", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const body = await c.req.json();

  const [item] = await db
    .insert(schema.icaroContributions)
    .values({
      userId: user.id,
      title: body.title,
      content: body.content,
      status: body.status ?? "draft",
    })
    .returning();

  return c.json({ contribution: item }, 201);
});

// Update contribution
contributions.put("/:id", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();

  const existing = await db.query.icaroContributions.findFirst({
    where: and(
      eq(schema.icaroContributions.id, id),
      eq(schema.icaroContributions.userId, user.id)
    ),
  });

  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  await db
    .update(schema.icaroContributions)
    .set({
      title: body.title ?? existing.title,
      content: body.content ?? existing.content,
      status: body.status ?? existing.status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.icaroContributions.id, id));

  return c.json({ ok: true });
});

// Admin: list all contributions
contributions.get("/admin/all", requireAdmin, async (c) => {
  const db = c.get("db");
  const items = await db.query.icaroContributions.findMany({
    orderBy: (ic, { desc }) => [desc(ic.updatedAt)],
  });
  return c.json({ contributions: items });
});

// Admin: publish approved contribution as icaro
contributions.post("/admin/:id/publish", requireAdmin, async (c) => {
  const db = c.get("db");
  const id = parseInt(c.req.param("id"));

  const contribution = await db.query.icaroContributions.findFirst({
    where: eq(schema.icaroContributions.id, id),
  });

  if (!contribution) {
    return c.json({ error: "Not found" }, 404);
  }

  if (contribution.status !== "approved") {
    return c.json({ error: "Contribution must be approved before publishing" }, 400);
  }

  const icaroId = `contrib-${id}`;
  const data = JSON.stringify({
    song: {
      sections: [
        {
          repeat: null,
          lines: contribution.content.split("\n").filter(Boolean).map((text, i) => ({
            text: text.trim(),
            repeat: null,
            phrase_idx: i,
          })),
        },
      ],
    },
    phrases: [],
    vocabulary: [],
    suffix_reference: [],
  });

  const existing = await db.query.icaros.findFirst({
    where: eq(schema.icaros.id, icaroId),
  });

  if (existing) {
    await db
      .update(schema.icaros)
      .set({ title: contribution.title, data, updatedAt: new Date().toISOString() })
      .where(eq(schema.icaros.id, icaroId));
  } else {
    await db.insert(schema.icaros).values({
      id: icaroId,
      title: contribution.title,
      source: "contributed",
      contributionId: id,
      data,
    });
  }

  await db
    .update(schema.icaroContributions)
    .set({ status: "published", updatedAt: new Date().toISOString() })
    .where(eq(schema.icaroContributions.id, id));

  return c.json({ ok: true, icaroId });
});

// Admin: update contribution status
contributions.put("/admin/:id", requireAdmin, async (c) => {
  const db = c.get("db");
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();

  await db
    .update(schema.icaroContributions)
    .set({
      status: body.status,
      adminNotes: body.adminNotes,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.icaroContributions.id, id));

  return c.json({ ok: true });
});

// Delete contribution
contributions.delete("/:id", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const id = parseInt(c.req.param("id"));

  await db
    .delete(schema.icaroContributions)
    .where(
      and(
        eq(schema.icaroContributions.id, id),
        eq(schema.icaroContributions.userId, user.id)
      )
    );

  return c.json({ ok: true });
});

export { contributions };
