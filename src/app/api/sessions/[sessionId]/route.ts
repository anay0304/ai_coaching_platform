import { getServerSession } from "@/services/auth.service";
import { getSession } from "@/services/session.service";

type Params = Promise<{ sessionId: string }>;

// ─── GET /api/sessions/[sessionId] ───────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Params }
): Promise<Response> {
  const authSession = await getServerSession();
  if (!authSession) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  const coachingSession = await getSession(sessionId);
  if (!coachingSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // Ensure this session belongs to the authenticated user.
  if (coachingSession.userId !== authSession.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json(coachingSession);
}
