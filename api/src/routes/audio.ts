import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { schema } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";
import type { Env } from "../types";

const audio = new Hono<Env>();

// List recordings for an icaro (public)
audio.get("/", async (c) => {
  const db = c.get("db");
  const icaroId = c.req.query("icaro_id");

  if (!icaroId) {
    return c.json({ error: "icaro_id is required" }, 400);
  }

  const recordings = await db.query.audioRecordings.findMany({
    where: and(
      eq(schema.audioRecordings.icaroId, icaroId),
      eq(schema.audioRecordings.status, "approved")
    ),
  });

  return c.json({ recordings });
});

// Upload audio file
audio.post("/", requireAuth, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const formData = await c.req.formData();

  const file = formData.get("file") as File | null;
  const icaroId = formData.get("icaro_id") as string;
  const singerName = formData.get("singer_name") as string;
  const singerBio = (formData.get("singer_bio") as string) || null;

  if (!file || !icaroId || !singerName) {
    return c.json(
      { error: "file, icaro_id, and singer_name are required" },
      400
    );
  }

  // Validate file type
  const allowedTypes = [
    "audio/mpeg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/wav",
    "audio/webm",
  ];
  if (!allowedTypes.includes(file.type)) {
    return c.json(
      { error: "Invalid file type. Allowed: mp3, m4a, wav, webm" },
      400
    );
  }

  // Validate file size (50MB max)
  if (file.size > 50 * 1024 * 1024) {
    return c.json({ error: "File too large. Max 50MB." }, 400);
  }

  // Upload to R2
  const r2Key = `icaros/${icaroId}/${crypto.randomUUID()}-${file.name}`;
  await c.env.AUDIO_BUCKET.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const [recording] = await db
    .insert(schema.audioRecordings)
    .values({
      icaroId,
      uploadedBy: user.id,
      singerName,
      singerBio,
      r2Key,
    })
    .returning();

  return c.json({ recording }, 201);
});

// Get signed URL for playback
audio.get("/:id/url", async (c) => {
  const db = c.get("db");
  const id = parseInt(c.req.param("id"));

  const recording = await db.query.audioRecordings.findFirst({
    where: eq(schema.audioRecordings.id, id),
  });

  if (!recording) {
    return c.json({ error: "Not found" }, 404);
  }

  const object = await c.env.AUDIO_BUCKET.get(recording.r2Key);
  if (!object) {
    return c.json({ error: "File not found" }, 404);
  }

  // Return the audio directly as a stream
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "audio/mpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

// Delete recording
audio.delete("/:id", requireAuth, async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const id = parseInt(c.req.param("id"));

  const recording = await db.query.audioRecordings.findFirst({
    where: eq(schema.audioRecordings.id, id),
  });

  if (!recording) {
    return c.json({ error: "Not found" }, 404);
  }

  // Only uploader or admin can delete
  if (recording.uploadedBy !== user.id && user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  await c.env.AUDIO_BUCKET.delete(recording.r2Key);
  await db
    .delete(schema.audioRecordings)
    .where(eq(schema.audioRecordings.id, id));

  return c.json({ ok: true });
});

// Admin: list all recordings
audio.get("/admin/all", requireAdmin, async (c) => {
  const db = c.get("db");
  const recordings = await db.query.audioRecordings.findMany({
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });
  return c.json({ recordings });
});

// Admin: update status/sort_order
audio.put("/:id", requireAdmin, async (c) => {
  const db = c.get("db");
  const id = parseInt(c.req.param("id"));
  const body = await c.req.json();

  // If approving, check max 5 per icaro
  if (body.status === "approved") {
    const recording = await db.query.audioRecordings.findFirst({
      where: eq(schema.audioRecordings.id, id),
    });

    if (recording) {
      const approvedCount = await db.query.audioRecordings.findMany({
        where: and(
          eq(schema.audioRecordings.icaroId, recording.icaroId),
          eq(schema.audioRecordings.status, "approved")
        ),
      });

      if (approvedCount.length >= 5) {
        return c.json(
          { error: "Max 5 approved recordings per icaro" },
          400
        );
      }
    }
  }

  await db
    .update(schema.audioRecordings)
    .set({
      status: body.status,
      sortOrder: body.sortOrder,
    })
    .where(eq(schema.audioRecordings.id, id));

  return c.json({ ok: true });
});

export { audio };
