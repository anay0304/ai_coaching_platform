import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageRole, SessionStatus, SessionType } from "@/types";
import type { CoachingSession, Message } from "@/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/services/auth.service", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/services/session.service", () => ({
  getSession: vi.fn(),
  endSession: vi.fn(),
}));

vi.mock("@/services/ai.service", () => ({
  generateSessionSummary: vi.fn(),
}));

vi.mock("@/services/profile.service", () => ({
  extractAndPersistGoals: vi.fn(),
}));

import { getServerSession } from "@/services/auth.service";
import { getSession, endSession } from "@/services/session.service";
import { generateSessionSummary } from "@/services/ai.service";
import { extractAndPersistGoals } from "@/services/profile.service";
import { POST } from "./route";

const mockGetServerSession = vi.mocked(getServerSession);
const mockGetSession = vi.mocked(getSession);
const mockEndSession = vi.mocked(endSession);
const mockGenerateSummary = vi.mocked(generateSessionSummary);
const mockExtractGoals = vi.mocked(extractAndPersistGoals);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AUTH_SESSION = {
  user: { id: "user-1", email: "u@test.com", name: "Test" },
  expires: "9999",
};

function makeSession(
  type: SessionType = SessionType.ONGOING,
  messages: Message[] = []
): CoachingSession & { messages: Message[] } {
  return {
    id: "session-1",
    userId: "user-1",
    type,
    status: SessionStatus.IN_PROGRESS,
    title: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages,
  };
}

function makeCompletedSession(type = SessionType.ONGOING): CoachingSession {
  return {
    id: "session-1",
    userId: "user-1",
    type,
    status: SessionStatus.COMPLETED,
    title: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const MESSAGES: Message[] = [
  { id: "m1", sessionId: "session-1", role: MessageRole.USER,      content: "I skip breakfast.",     createdAt: new Date() },
  { id: "m2", sessionId: "session-1", role: MessageRole.ASSISTANT, content: "Why do you skip it?",   createdAt: new Date() },
  { id: "m3", sessionId: "session-1", role: MessageRole.USER,      content: "No time in mornings.",  createdAt: new Date() },
];

const SUMMARY_RESULT = {
  nextActionSteps:    ["Prep overnight oats"],
  strugglesDiscussed: ["No time in mornings"],
  backupPlans:        ["Grab a banana on the way out"],
};

function makeEndRequest(): Request {
  return new Request("http://localhost/api/sessions/session-1/end", {
    method: "POST",
  });
}

// ─── Integration test 22.4 — session end → summary → dashboard reflection ─────
//
// Verifies the full flow:
//   1. POST /end authenticated + ownership verified
//   2. AI summary generated from conversation
//   3. Session marked COMPLETED with the summary attached
//   4. For INITIAL sessions: goals extracted and persisted on the user's profile
//   5. Response includes both the completed session and the structured summary
//      (the dashboard reads the summary to reflect the session outcome)

describe("Integration 22.4: session end → summary generation → dashboard reflection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates summary, marks session complete, and returns structured data for dashboard", async () => {
    mockGetServerSession.mockResolvedValue(AUTH_SESSION);
    mockGetSession.mockResolvedValue(makeSession(SessionType.ONGOING, MESSAGES));
    mockGenerateSummary.mockResolvedValue(SUMMARY_RESULT);
    mockEndSession.mockResolvedValue(makeCompletedSession());

    const response = await POST(makeEndRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(200);

    const body = await response.json() as {
      session: CoachingSession;
      summary: typeof SUMMARY_RESULT;
    };

    // Response shape the dashboard depends on
    expect(body.session.status).toBe(SessionStatus.COMPLETED);
    expect(body.summary.nextActionSteps).toEqual(SUMMARY_RESULT.nextActionSteps);
    expect(body.summary.strugglesDiscussed).toEqual(SUMMARY_RESULT.strugglesDiscussed);
    expect(body.summary.backupPlans).toEqual(SUMMARY_RESULT.backupPlans);

    // generateSessionSummary was called with the conversation messages
    expect(mockGenerateSummary).toHaveBeenCalledWith(MESSAGES);

    // endSession was called with the formatted content + keyInsights
    expect(mockEndSession).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({
        keyInsights: SUMMARY_RESULT.nextActionSteps,
      })
    );
  });

  it("extracts goals from INITIAL sessions so the dashboard profile is populated", async () => {
    mockGetServerSession.mockResolvedValue(AUTH_SESSION);
    mockGetSession.mockResolvedValue(makeSession(SessionType.INITIAL, MESSAGES));
    mockGenerateSummary.mockResolvedValue(SUMMARY_RESULT);
    mockEndSession.mockResolvedValue(makeCompletedSession(SessionType.INITIAL));
    mockExtractGoals.mockResolvedValue(undefined);

    await POST(makeEndRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    // Goals must be extracted for INITIAL sessions (populates dashboard profile section)
    expect(mockExtractGoals).toHaveBeenCalledWith("user-1", "session-1");
  });

  it("does NOT extract goals for non-INITIAL session types", async () => {
    for (const type of [SessionType.CHECKIN, SessionType.ONGOING]) {
      vi.clearAllMocks();
      mockGetServerSession.mockResolvedValue(AUTH_SESSION);
      mockGetSession.mockResolvedValue(makeSession(type, MESSAGES));
      mockGenerateSummary.mockResolvedValue(SUMMARY_RESULT);
      mockEndSession.mockResolvedValue(makeCompletedSession(type));

      await POST(makeEndRequest(), {
        params: Promise.resolve({ sessionId: "session-1" }),
      });

      expect(mockExtractGoals).not.toHaveBeenCalled();
    }
  });

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const response = await POST(makeEndRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 403 when session belongs to a different user", async () => {
    mockGetServerSession.mockResolvedValue(AUTH_SESSION);
    mockGetSession.mockResolvedValue(
      makeSession(SessionType.ONGOING, []) as CoachingSession & { messages: Message[] } & { userId: string } as never
    );
    // Override userId so the ownership check fails
    (mockGetSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...makeSession(),
      userId: "other-user",
    });
    const response = await POST(makeEndRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });
    expect(response.status).toBe(403);
  });

  it("includes all summary sections in the content written to the DB", async () => {
    mockGetServerSession.mockResolvedValue(AUTH_SESSION);
    mockGetSession.mockResolvedValue(makeSession(SessionType.ONGOING, MESSAGES));
    mockGenerateSummary.mockResolvedValue(SUMMARY_RESULT);
    mockEndSession.mockResolvedValue(makeCompletedSession());

    await POST(makeEndRequest(), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    const endArgs = mockEndSession.mock.calls[0][1] as { content: string };
    expect(endArgs.content).toContain("Next steps:");
    expect(endArgs.content).toContain("Prep overnight oats");
    expect(endArgs.content).toContain("Struggles discussed:");
    expect(endArgs.content).toContain("Backup plans:");
  });
});
