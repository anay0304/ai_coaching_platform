import { getServerSession } from "@/services/auth.service";
import { getSession, endSession } from "@/services/session.service";
import { generateSessionSummary } from "@/services/ai.service";
import { extractAndPersistGoals } from "@/services/profile.service";
import { SessionType } from "@/types";

type Params = Promise<{ sessionId: string }>;

// ─── POST /api/sessions/[sessionId]/end ───────────────────────────────────────
//
// Workflow:
//  1. Authenticate and verify session ownership.
//  2. Call generateSessionSummary to get structured AI insights.
//  3. Persist the summary and mark the session COMPLETED via endSession.
//  4. If the session was INITIAL, also call extractAndPersistGoals so the
//     user's profile goals are populated from this first session.

export async function POST(
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

  if (coachingSession.userId !== authSession.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate a structured summary from the conversation.
  const { nextActionSteps, strugglesDiscussed, backupPlans } =
    await generateSessionSummary(coachingSession.messages);

  // Map the structured result to the SessionSummary schema:
  //   content    — human-readable text combining all three sections
  //   keyInsights — the concrete next steps the user committed to
  const content = [
    nextActionSteps.length > 0
      ? `Next steps:\n${nextActionSteps.map((s) => `- ${s}`).join("\n")}`
      : "",
    strugglesDiscussed.length > 0
      ? `Struggles discussed:\n${strugglesDiscussed.map((s) => `- ${s}`).join("\n")}`
      : "",
    backupPlans.length > 0
      ? `Backup plans:\n${backupPlans.map((s) => `- ${s}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const completed = await endSession(sessionId, {
    content: content || "Session completed.",
    keyInsights: nextActionSteps,
  });

  // For INITIAL sessions, extract goals from the conversation and persist them
  // on the user's profile so the coach knows what the user is working toward.
  if (coachingSession.type === SessionType.INITIAL) {
    await extractAndPersistGoals(authSession.user.id, sessionId);
  }

  return Response.json({
    session: completed,
    summary: { nextActionSteps, strugglesDiscussed, backupPlans },
  });
}
