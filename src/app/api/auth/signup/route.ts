import { signUp } from "@/services/auth.service";

// ─── POST /api/auth/signup ────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const { email, password, name } = body;

  if (typeof email !== "string" || typeof password !== "string") {
    return Response.json(
      { error: "email and password are required" },
      { status: 400 }
    );
  }

  try {
    await signUp(email, password, typeof name === "string" ? name : undefined);
    return Response.json({ success: true }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Sign-up failed. Please try again.";
    return Response.json({ error: message }, { status: 400 });
  }
}
