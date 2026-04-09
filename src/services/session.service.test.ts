import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import type { CoachingSession, Message, SessionSummary } from "@/types";
import { SessionType, SessionStatus, MessageRole } from "@/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    coachingSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    sessionSummary: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createSession,
  getSession,
  getUserSessions,
  addMessage,
  getSessionCount,
} from "./session.service";

// Cast to plain vi.fn so TypeScript doesn't fight us on Prisma's complex types
const mockCreate = prisma.coachingSession.create as unknown as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.coachingSession.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.coachingSession.findMany as unknown as ReturnType<typeof vi.fn>;
const mockCount = prisma.coachingSession.count as unknown as ReturnType<typeof vi.fn>;
const mockMessageCreate = prisma.message.create as unknown as ReturnType<typeof vi.fn>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<CoachingSession> = {}): CoachingSession {
  return {
    id: "session-1",
    userId: "user-1",
    type: SessionType.INITIAL,
    status: SessionStatus.IN_PROGRESS,
    title: null,
    createdAt: new Date("2024-06-01T12:00:00Z"),
    updatedAt: new Date("2024-06-01T12:00:00Z"),
    ...overrides,
  };
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "msg-1",
    sessionId: "session-1",
    role: MessageRole.USER,
    content: "hello",
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── Property 3: Message persistence round-trip ───────────────────────────────
//
// For any (role, content, sessionId) tuple:
//   addMessage stores the message, getSession returns it unchanged.

describe("Property 3: Message persistence round-trip", () => {
  beforeEach(() => vi.clearAllMocks());

  it("every message persisted via addMessage appears unchanged in getSession", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(MessageRole.USER, MessageRole.ASSISTANT, MessageRole.SYSTEM),
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (role, content, sessionId) => {
          const msg = makeMessage({ role, content, sessionId, id: "msg-x" });
          const session = makeSession({
            id: sessionId,
            messages: [msg],
          } as CoachingSession & { messages: Message[] } as CoachingSession);

          mockMessageCreate.mockResolvedValue(msg);
          mockFindUnique.mockResolvedValue({ ...session, messages: [msg] });

          const persisted = await addMessage(sessionId, role, content);
          const retrieved = await getSession(sessionId);

          // The message returned by addMessage must match what was stored
          expect(persisted.role).toBe(role);
          expect(persisted.content).toBe(content);
          expect(persisted.sessionId).toBe(sessionId);

          // The same message must appear inside getSession
          const found = retrieved?.messages.find((m) => m.id === persisted.id);
          expect(found).toBeDefined();
          expect(found?.role).toBe(role);
          expect(found?.content).toBe(content);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Property 4: Session list ordering ───────────────────────────────────────
//
// getUserSessions must always request sessions ordered newest-first from the DB.
// We verify the orderBy argument rather than re-sorting in the service itself —
// the responsibility for ordering belongs to the database query.

describe("Property 4: Session list ordering", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getUserSessions always queries with orderBy createdAt desc regardless of session count", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (count, userId) => {
          const sessions = Array.from({ length: count }, (_, i) =>
            makeSession({
              id: `s-${i}`,
              userId,
              createdAt: new Date(Date.now() - i * 60_000),
            })
          );
          mockFindMany.mockResolvedValue(sessions);

          const result = await getUserSessions(userId);

          // 1. Correct orderBy was passed to findMany
          expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { userId },
              orderBy: { createdAt: "desc" },
            })
          );

          // 2. The returned array is in descending order by createdAt
          for (let i = 1; i < result.length; i++) {
            expect(result[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
              result[i].createdAt.getTime()
            );
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ─── Property 5: Session creation for all session types ──────────────────────
//
// createSession must always store the correct userId, type, and IN_PROGRESS
// status. ("ACTIVE" in the task description is a shorthand for IN_PROGRESS —
// our schema uses IN_PROGRESS to represent an open, active session.)

describe("Property 5: Session creation for all session types", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createSession records correct userId, type, and IN_PROGRESS status for every session type", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom(SessionType.INITIAL, SessionType.CHECKIN, SessionType.ONGOING),
        async (userId, type) => {
          const created = makeSession({ userId, type, status: SessionStatus.IN_PROGRESS });
          mockCreate.mockResolvedValue(created);

          const result = await createSession(userId, type);

          // Verify the data passed to Prisma matches what the caller requested
          expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                userId,
                type,
                status: SessionStatus.IN_PROGRESS,
              }),
            })
          );

          // Verify the returned record has the right shape
          expect(result.userId).toBe(userId);
          expect(result.type).toBe(type);
          expect(result.status).toBe(SessionStatus.IN_PROGRESS);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Property 11: Dashboard session count accuracy ────────────────────────────
//
// getSessionCount(userId, COMPLETED) must return exactly the number of
// COMPLETED sessions — no more, no less.

describe("Property 11: Dashboard session count accuracy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getSessionCount returns exactly the count of COMPLETED sessions for any non-negative n", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 200 }),
        fc.string({ minLength: 1 }),
        async (completedCount, userId) => {
          mockCount.mockResolvedValue(completedCount);

          const result = await getSessionCount(userId, SessionStatus.COMPLETED);

          // Correct filter was passed to Prisma
          expect(mockCount).toHaveBeenCalledWith(
            expect.objectContaining({
              where: expect.objectContaining({
                userId,
                status: SessionStatus.COMPLETED,
              }),
            })
          );

          // Exact count is returned untransformed
          expect(result).toBe(completedCount);
        }
      ),
      { numRuns: 50 }
    );
  });
});
