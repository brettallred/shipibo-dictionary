import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { schema } from "../db";
import { requireAuth } from "../middleware/auth";
import type { Env } from "../types";

const chat = new Hono<Env>();

chat.use("/*", requireAuth);

// Send message and get AI response (placeholder for Phase 8)
chat.post("/", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const { message, sessionId } = await c.req.json();

  const chatSessionId = sessionId || crypto.randomUUID();

  // Save user message
  await db.insert(schema.chatMessages).values({
    userId: user.id,
    sessionId: chatSessionId,
    role: "user",
    content: message,
  });

  // Placeholder response — will be replaced with AI in Phase 8
  const assistantResponse =
    "AI chat will be available soon. This is a placeholder response.";

  await db.insert(schema.chatMessages).values({
    userId: user.id,
    sessionId: chatSessionId,
    role: "assistant",
    content: assistantResponse,
  });

  return c.json({
    sessionId: chatSessionId,
    response: assistantResponse,
  });
});

// List chat sessions
chat.get("/sessions", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");

  const messages = await db.query.chatMessages.findMany({
    where: eq(schema.chatMessages.userId, user.id),
    orderBy: (m, { desc }) => [desc(m.createdAt)],
  });

  // Group by session
  const sessions = new Map<string, { id: string; lastMessage: string; createdAt: string }>();
  for (const msg of messages) {
    if (!sessions.has(msg.sessionId)) {
      sessions.set(msg.sessionId, {
        id: msg.sessionId,
        lastMessage: msg.content.slice(0, 100),
        createdAt: msg.createdAt,
      });
    }
  }

  return c.json({ sessions: Array.from(sessions.values()) });
});

// Get chat history for a session
chat.get("/sessions/:id", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const sessionId = c.req.param("id");

  const messages = await db.query.chatMessages.findMany({
    where: and(
      eq(schema.chatMessages.userId, user.id),
      eq(schema.chatMessages.sessionId, sessionId)
    ),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });

  return c.json({ messages });
});

export { chat };
