import { getServerSession } from "@/services/auth.service";
import { createSession } from "@/services/session.service";
import { SessionType } from "@/types";

// ─── POST /api/sessions ───────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  // Validate that the caller provided a recognised session type.
  const { type, title } = body;
  const validTypes = Object.values(SessionType) as string[];
  if (typeof type !== "string" || !validTypes.includes(type)) {
    return Response.json(
      { error: `type must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  const coachingSession = await createSession(
    session.user.id,
    type as SessionType,
    typeof title === "string" ? title : undefined
  );

  return Response.json(coachingSession, { status: 201 });
}
