import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { schema } from "../db";
import { requireAuth } from "../middleware/auth";
import type { Env } from "../types";

const auth = new Hono<Env>();

// Exchange Google OAuth code for session
auth.post("/google", async (c) => {
  const { code, redirect_uri } = await c.req.json();

  // Exchange code for tokens with Google
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return c.json({ error: "Failed to exchange code" }, 400);
  }

  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    id_token: string;
  };

  // Get user info from Google
  const userInfoResponse = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    }
  );

  if (!userInfoResponse.ok) {
    return c.json({ error: "Failed to get user info" }, 400);
  }

  const googleUser = (await userInfoResponse.json()) as {
    id: string;
    email: string;
    name: string;
    picture: string;
  };

  const db = c.get("db");

  // Upsert user
  let user = await db.query.users.findFirst({
    where: eq(schema.users.googleId, googleUser.id),
  });

  if (!user) {
    const [newUser] = await db
      .insert(schema.users)
      .values({
        googleId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        avatarUrl: googleUser.picture,
      })
      .returning();
    user = newUser;
  } else {
    await db
      .update(schema.users)
      .set({
        name: googleUser.name,
        avatarUrl: googleUser.picture,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.users.id, user.id));
  }

  // Create session token
  const sessionToken = crypto.randomUUID();
  await c.env.SESSIONS.put(
    sessionToken,
    JSON.stringify({ userId: user.id }),
    { expirationTtl: 60 * 60 * 24 * 30 } // 30 days
  );

  return c.json({
    token: sessionToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  });
});

// Dev login (only when DISABLE_AUTH=true)
auth.post("/dev-login", async (c) => {
  if (c.env.DISABLE_AUTH !== "true") {
    return c.json({ error: "Dev login disabled" }, 403);
  }

  const db = c.get("db");
  const devEmail = "brettallred@gmail.com";
  const devName = "Brett Allred";
  const devGoogleId = "dev-user-001";

  // Upsert dev user
  let user = await db.query.users.findFirst({
    where: eq(schema.users.email, devEmail),
  });

  if (!user) {
    const [newUser] = await db
      .insert(schema.users)
      .values({
        googleId: devGoogleId,
        email: devEmail,
        name: devName,
        role: "admin",
      })
      .returning();
    user = newUser;
  }

  // Create session token
  const sessionToken = crypto.randomUUID();
  await c.env.SESSIONS.put(
    sessionToken,
    JSON.stringify({ userId: user.id }),
    { expirationTtl: 60 * 60 * 24 * 30 }
  );

  return c.json({
    token: sessionToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  });
});

// Get current user
auth.get("/me", requireAuth, async (c) => {
  const user = c.get("user")!;
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    },
  });
});

// Logout
auth.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (token) {
    await c.env.SESSIONS.delete(token);
  }
  return c.json({ ok: true });
});

export { auth };
