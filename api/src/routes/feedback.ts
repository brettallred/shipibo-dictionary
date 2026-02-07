import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { schema } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";
import type { Env } from "../types";

const feedbackRoutes = new Hono<Env>();

// Submit feedback (authenticated user)
feedbackRoutes.post("/", requireAuth, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const body = await c.req.json();

  const [item] = await db
    .insert(schema.feedback)
    .values({
      userId: user.id,
      targetType: body.targetType,
      targetId: body.targetId,
      category: body.category,
      message: body.message,
    })
    .returning();

  return c.json({ feedback: item }, 201);
});

// List feedback (admin only)
feedbackRoutes.get("/", requireAdmin, async (c) => {
  const db = c.get("db");
  const items = await db.query.feedback.findMany({
    orderBy: (f, { desc }) => [desc(f.createdAt)],
  });
  return c.json({ feedback: items });
});

// Update feedback status (admin only)
feedbackRoutes.put("/:id", requireAdmin, async (c) => {
  const db = c.get("db");
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();

  await db
    .update(schema.feedback)
    .set({
      status: body.status,
      adminNotes: body.adminNotes,
    })
    .where(eq(schema.feedback.id, id));

  return c.json({ ok: true });
});

export { feedbackRoutes };
