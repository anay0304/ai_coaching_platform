import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageRole, SessionStatus, SessionType } from "@/types";
import type { CoachingSession, Message, SessionSummary } from "@/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────
//
// Route tests mock at the service boundary so the route handler logic runs in
// full while network I/O (Prisma, OpenAI) is replaced by predictable stubs.

vi.mock("@/services/auth.service", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/services/session.service", () => ({
  getSession: vi.fn(),
  addMessage: vi.fn(),
  getLatestSummary: vi.fn(),
}));

vi.mock("@/services/ai.service", () => ({
  streamChatResponse: vi.fn(),
}));

import { getServerSession } from "@/services/auth.service";
import { getSession, addMessage, getLatestSummary } from "@/services/session.service";
import { streamChatResponse } from "@/services/ai.service";
import { POST } from "./route";

const mockGetSession = vi.mocked(getSession);
const mockAddMessage = vi.mocked(addMessage);
const mockGetLatestSummary = vi.mocked(getLatestSummary);
const mockStreamChat = vi.mocked(streamChatResponse);
const mockGetServerSession = vi.mocked(getServerSession);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const AUTH_SESSION = {
  user: { id: "user-1", email: "u@test.com", name: "Test" },
  expires: "9999",
};

function makeSession(overrides: Partial<CoachingSession> = {}): CoachingSession & { messages: Message[] } {
  return {
    id: "session-1",
    userId: "user-1",
    type: SessionType.ONGOING,
    status: SessionStatus.IN_PROGRESS,
    title: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
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

/** Reads an SSE ReadableStream to a plain string. */
async function drainSSE(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

function makeRequest(content: string): Request {
  return new Request("http://localhost/api/sessions/session-1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

// ─── Integration test 22.3 — message send → persist → retrieve cycle ──────────
//
// This verifies the complete lifecycle a message goes through:
//   1. POST arrives → user message persisted BEFORE the AI is called
//   2. OpenAI stream consumed → AI reply accumulated
//   3. Assistant message persisted AFTER the stream ends
//   4. Retrieval (simulated by the second getSession mock) returns both messages

describe("Integration 22.3: message send → persist → retrieve cycle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists the user message first, streams the AI reply, then persists the assistant message", async () => {
    const session = makeSession();
    const userMsg = makeMessage({ id: "msg-u", role: MessageRole.USER, content: "What should I eat?" });
    const assistantMsg = makeMessage({ id: "msg-a", role: MessageRole.ASSISTANT, content: "Try more vegetables." });

    // Session with user message — returned on second getSession (after addMessage)
    const sessionWithUserMsg = makeSession({ messages: [userMsg] });

    mockGetServerSession.mockResolvedValue(AUTH_SESSION);
    mockGetSession
      .mockResolvedValueOnce(session)            // ownership check
      .mockResolvedValueOnce(sessionWithUserMsg); // reload for AI context
    mockAddMessage
      .mockResolvedValueOnce(userMsg)            // persist user msg
      .mockResolvedValueOnce(assistantMsg);      // persist assistant msg
    mockGetLatestSummary.mockResolvedValue(null as unknown as SessionSummary);

    // OpenAI stream yields two chunks
    const aiStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { choices: [{ delta: { content: "Try more " } }] };
        yield { choices: [{ delta: { content: "vegetables." } }] };
      },
    };
    mockStreamChat.mockResolvedValue(aiStream as never);

    const response = await POST(makeRequest("What should I eat?"), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");

    const sseText = await drainSSE(response.body!);

    // SSE payload contains both AI chunks and the terminal [DONE] event
    expect(sseText).toContain("data: Try more ");
    expect(sseText).toContain("data: vegetables.");
    expect(sseText).toContain("data: [DONE]");

    // User message must be persisted BEFORE the AI is called
    const addMessageCalls = mockAddMessage.mock.invocationCallOrder;
    const streamChatCalls = mockStreamChat.mock.invocationCallOrder;
    expect(addMessageCalls[0]).toBeLessThan(streamChatCalls[0]);

    // Assistant message persisted with the full accumulated content
    expect(mockAddMessage).toHaveBeenCalledWith(
      "session-1",
      MessageRole.ASSISTANT,
      "Try more vegetables."
    );

    // Retrieve cycle: getSession was called twice (ownership + reload)
    expect(mockGetSession).toHaveBeenCalledTimes(2);
    // The reload returns the session including the user message, which was
    // passed to streamChatResponse as the conversation history
    expect(mockStreamChat).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ role: MessageRole.USER, content: "What should I eat?" }),
      ]),
      undefined // no prior summary
    );
  });

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const response = await POST(makeRequest("hello"), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 404 when session does not exist", async () => {
    mockGetServerSession.mockResolvedValue(AUTH_SESSION);
    mockGetSession.mockResolvedValue(null);
    const response = await POST(makeRequest("hello"), {
      params: Promise.resolve({ sessionId: "bad-id" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 403 when session belongs to a different user", async () => {
    mockGetServerSession.mockResolvedValue(AUTH_SESSION);
    mockGetSession.mockResolvedValue(makeSession({ userId: "other-user" }));
    const response = await POST(makeRequest("hello"), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });
    expect(response.status).toBe(403);
  });

  it("returns 400 when content is empty", async () => {
    mockGetServerSession.mockResolvedValue(AUTH_SESSION);
    mockGetSession.mockResolvedValue(makeSession());
    const response = await POST(makeRequest("   "), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });
    expect(response.status).toBe(400);
  });

  it("keeps user message visible but returns 500 when OpenAI is unavailable", async () => {
    mockGetServerSession.mockResolvedValue(AUTH_SESSION);
    mockGetSession
      .mockResolvedValueOnce(makeSession())
      .mockResolvedValueOnce(makeSession({ messages: [makeMessage()] }));
    mockAddMessage.mockResolvedValue(makeMessage());
    mockGetLatestSummary.mockResolvedValue(null as unknown as SessionSummary);
    mockStreamChat.mockRejectedValue(new Error("OpenAI down"));

    const response = await POST(makeRequest("hello"), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });
    expect(response.status).toBe(500);

    // User message was already persisted before the failure
    expect(mockAddMessage).toHaveBeenCalledWith("session-1", MessageRole.USER, "hello");
  });

  it("includes prior session summary in the AI context when one exists", async () => {
    const summary = {
      id: "sum-1",
      sessionId: "old-session",
      content: "User wants to eat less sugar.",
      keyInsights: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as SessionSummary;

    mockGetServerSession.mockResolvedValue(AUTH_SESSION);
    mockGetSession
      .mockResolvedValueOnce(makeSession())
      .mockResolvedValueOnce(makeSession({ messages: [makeMessage()] }));
    mockAddMessage.mockResolvedValue(makeMessage());
    mockGetLatestSummary.mockResolvedValue(summary);
    const aiStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { choices: [{ delta: { content: "Good progress!" } }] };
      },
    };
    mockStreamChat.mockResolvedValue(aiStream as never);

    await POST(makeRequest("hello"), {
      params: Promise.resolve({ sessionId: "session-1" }),
    });

    // The prior summary content must be passed through to the AI
    expect(mockStreamChat).toHaveBeenCalledWith(
      expect.any(Array),
      "User wants to eat less sugar."
    );
  });
});
