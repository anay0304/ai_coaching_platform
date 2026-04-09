import type { CoachingSession, Message, SessionSummary } from "@/types";
import { SessionType, SessionStatus, MessageRole } from "@/types";
import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A session with its messages pre-loaded — used when rendering a conversation. */
export type SessionWithMessages = CoachingSession & { messages: Message[] };

// ─── createSession ────────────────────────────────────────────────────────────

/**
 * Opens a new coaching session for the given user.
 * Status defaults to IN_PROGRESS.
 */
export async function createSession(
  userId: string,
  type: SessionType,
  title?: string
): Promise<CoachingSession> {
  return prisma.coachingSession.create({
    data: {
      userId,
      type,
      status: SessionStatus.IN_PROGRESS,
      title: title ?? null,
    },
  });
}

// ─── getSession ───────────────────────────────────────────────────────────────

/**
 * Returns a session and all its messages (oldest first), or null if not found.
 */
export async function getSession(
  sessionId: string
): Promise<SessionWithMessages | null> {
  return prisma.coachingSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

// ─── getUserSessions ──────────────────────────────────────────────────────────

/**
 * Returns all sessions for a user, newest first.
 */
export async function getUserSessions(
  userId: string
): Promise<CoachingSession[]> {
  return prisma.coachingSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// ─── addMessage ───────────────────────────────────────────────────────────────

/**
 * Appends a message to a session and returns the persisted record.
 */
export async function addMessage(
  sessionId: string,
  role: MessageRole,
  content: string
): Promise<Message> {
  return prisma.message.create({
    data: { sessionId, role, content },
  });
}

// ─── endSession ───────────────────────────────────────────────────────────────

/**
 * Marks a session as COMPLETED and optionally attaches a summary.
 * Returns the updated session.
 */
export async function endSession(
  sessionId: string,
  summary?: { content: string; keyInsights: string[] }
): Promise<CoachingSession> {
  return prisma.coachingSession.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.COMPLETED,
      ...(summary && {
        summary: {
          upsert: {
            create: summary,
            update: summary,
          },
        },
      }),
    },
  });
}

// ─── getLatestSummary ─────────────────────────────────────────────────────────

/**
 * Returns the most recently created summary across all of a user's sessions.
 * Useful for displaying a recap on the dashboard after a session ends.
 */
export async function getLatestSummary(
  userId: string
): Promise<SessionSummary | null> {
  return prisma.sessionSummary.findFirst({
    where: {
      session: {
        userId,
        status: SessionStatus.COMPLETED,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── getSessionCount ──────────────────────────────────────────────────────────

/**
 * Counts sessions for a user, optionally filtered by status.
 * Pass `status: SessionStatus.COMPLETED` to get the dashboard "completed" count.
 */
export async function getSessionCount(
  userId: string,
  status?: SessionStatus
): Promise<number> {
  return prisma.coachingSession.count({
    where: {
      userId,
      ...(status !== undefined && { status }),
    },
  });
}
