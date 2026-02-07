import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { schema } from "../db";
import { requireAuth } from "../middleware/auth";
import type { Env } from "../types";

const chat = new Hono<Env>();

chat.use("/*", requireAuth);

const SYSTEM_PROMPT = `You are a knowledgeable assistant specializing in the Shipibo language and culture. Shipibo (Shipibo-Conibo) is an indigenous Panoan language spoken by the Shipibo people of the Peruvian Amazon, primarily along the Ucayali River in Peru.

Your expertise includes:
- Shipibo vocabulary, grammar, and morphology
- Icaros (traditional healing songs sung by Shipibo shamans/curanderos)
- Shipibo cultural practices, especially those related to plant medicine traditions
- The relationship between Shipibo language and their cosmological worldview
- Morphological analysis of Shipibo words (suffixes, prefixes, verb forms)

When answering questions:
- If you have dictionary entries or icaro data provided as context, use them to give accurate, specific answers
- Explain Shipibo morphology when relevant (break down compound words into their parts)
- Be honest when you're uncertain — Shipibo is a less-documented language and it's better to acknowledge uncertainty than to fabricate
- You can discuss cultural context but be respectful of indigenous knowledge traditions
- When discussing icaros, explain their cultural significance as healing songs used in ceremony

Respond concisely and helpfully. Use Shipibo terms with translations where appropriate.`;

function buildContextPrompt(context?: {
  icaro?: { title: string; phrases?: { text: string; morphemes?: unknown[] }[] };
  entries?: { headword: string; part_of_speech?: string; definitions_english?: string[]; examples?: { shipibo: string; english: string }[] }[];
}): string {
  if (!context) return "";

  let ctx = "\n\n--- REFERENCE DATA ---\n";

  if (context.icaro) {
    ctx += `\nCurrently viewing icaro: "${context.icaro.title}"\n`;
    if (context.icaro.phrases?.length) {
      ctx += "Phrases:\n";
      for (const p of context.icaro.phrases) {
        ctx += `- ${p.text}\n`;
        if (p.morphemes && Array.isArray(p.morphemes)) {
          for (const m of p.morphemes as { shipibo?: string; english?: string }[]) {
            if (m.shipibo) ctx += `  ${m.shipibo}: ${m.english || ""}\n`;
          }
        }
      }
    }
  }

  if (context.entries?.length) {
    ctx += "\nRelevant dictionary entries:\n";
    for (const e of context.entries.slice(0, 10)) {
      ctx += `- ${e.headword}`;
      if (e.part_of_speech) ctx += ` (${e.part_of_speech})`;
      if (e.definitions_english?.length) {
        ctx += `: ${e.definitions_english.join("; ")}`;
      }
      ctx += "\n";
      if (e.examples?.length) {
        for (const ex of e.examples.slice(0, 2)) {
          ctx += `  Example: "${ex.shipibo}" — "${ex.english}"\n`;
        }
      }
    }
  }

  return ctx;
}

// Send message and get AI response
chat.post("/", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const { message, sessionId, context } = await c.req.json();

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return c.json({ error: "Message is required" }, 400);
  }

  const chatSessionId = sessionId || crypto.randomUUID();

  // Save user message
  await db.insert(schema.chatMessages).values({
    userId: user.id,
    sessionId: chatSessionId,
    role: "user",
    content: message,
  });

  // Load conversation history for this session
  const history = await db.query.chatMessages.findMany({
    where: and(
      eq(schema.chatMessages.userId, user.id),
      eq(schema.chatMessages.sessionId, chatSessionId)
    ),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });

  // Build messages array for Claude (last 20 messages for context window)
  const recentHistory = history.slice(-20);
  const messages = recentHistory.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Build system prompt with optional context
  const contextPrompt = buildContextPrompt(context);
  const systemPrompt = SYSTEM_PROMPT + contextPrompt;

  // Call Anthropic API
  let assistantResponse: string;
  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": c.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errBody);
      assistantResponse =
        "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.";
    } else {
      const data = (await anthropicRes.json()) as {
        content: { type: string; text: string }[];
      };
      assistantResponse =
        data.content?.[0]?.text ||
        "I received your message but couldn't generate a response.";
    }
  } catch (err) {
    console.error("Chat error:", err);
    assistantResponse =
      "I'm sorry, something went wrong. Please try again.";
  }

  // Save assistant response
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
  const sessions = new Map<
    string,
    { id: string; lastMessage: string; createdAt: string }
  >();
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

// Delete a chat session
chat.delete("/sessions/:id", async (c) => {
  const user = c.get("user")!;
  const db = c.get("db");
  const sessionId = c.req.param("id");

  await db
    .delete(schema.chatMessages)
    .where(
      and(
        eq(schema.chatMessages.userId, user.id),
        eq(schema.chatMessages.sessionId, sessionId)
      )
    );

  return c.json({ ok: true });
});

export { chat };
