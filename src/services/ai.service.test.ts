import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import { MessageRole } from "@/types";
import type { ChatMessage } from "@/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

import { openai } from "@/lib/openai";
import {
  streamChatResponse,
  generateSessionSummary,
  COACHING_SYSTEM_PROMPT,
} from "./ai.service";

const mockCreate = openai.chat.completions.create as unknown as ReturnType<typeof vi.fn>;

// A minimal stub that satisfies the Stream interface for tests that only care
// about what arguments were passed to create(), not what came back.
const MOCK_STREAM = {
  [Symbol.asyncIterator]: async function* () {},
  toReadableStream: () => new ReadableStream(),
};

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const roleArb = fc.constantFrom(
  MessageRole.USER,
  MessageRole.ASSISTANT,
  MessageRole.SYSTEM
);

const nonSystemRoleArb = fc.constantFrom(MessageRole.USER, MessageRole.ASSISTANT);

const messageArb = fc.record<ChatMessage>({
  role: roleArb,
  content: fc.string({ minLength: 1, maxLength: 200 }),
});

const nonSystemMessageArb = fc.record<ChatMessage>({
  role: nonSystemRoleArb,
  content: fc.string({ minLength: 1, maxLength: 200 }),
});

// ─── Property 6: AI context completeness ─────────────────────────────────────
//
// For any message history passed to streamChatResponse:
//   1. The first message sent to OpenAI is always the coaching system prompt.
//   2. Every non-SYSTEM message appears in the OpenAI call, in the same order.

describe("Property 6: AI context completeness", () => {
  beforeEach(() => vi.clearAllMocks());

  it("system prompt is always first and all non-SYSTEM prior messages are present in order", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(messageArb, { minLength: 0, maxLength: 15 }),
        async (messages) => {
          mockCreate.mockResolvedValue(MOCK_STREAM);

          await streamChatResponse(messages);

          const callArgs = mockCreate.mock.lastCall![0] as {
            messages: Array<{ role: string; content: string }>;
          };

          const sent = callArgs.messages;

          // Rule 1: first message is always the coaching system prompt
          expect(sent[0].role).toBe("system");
          expect(sent[0].content).toBe(COACHING_SYSTEM_PROMPT);

          // Rule 2: every non-SYSTEM input message appears in the sent array,
          // in the same relative order
          const nonSystemInput = messages.filter(
            (m) => m.role !== MessageRole.SYSTEM
          );

          // Extract the non-system messages from what was sent (skip the first
          // system prompt we added ourselves)
          const sentConversation = sent.slice(1).filter(
            (m: { role: string }) => m.role !== "system"
          );

          expect(sentConversation).toHaveLength(nonSystemInput.length);
          nonSystemInput.forEach((msg, i) => {
            expect(sentConversation[i].content).toBe(msg.content);
          });
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Property 7: Prior session context inclusion ──────────────────────────────
//
// When a prior session summary is provided to streamChatResponse, it must
// appear as a system message in the context sent to OpenAI — after the main
// system prompt but before the conversation messages.

describe("Property 7: Prior session context inclusion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prior session summary is always present in the OpenAI context when provided", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 300 }),
        fc.array(nonSystemMessageArb, { minLength: 0, maxLength: 10 }),
        async (priorSummary, messages) => {
          mockCreate.mockResolvedValue(MOCK_STREAM);

          await streamChatResponse(messages, priorSummary);

          const callArgs = mockCreate.mock.lastCall![0] as {
            messages: Array<{ role: string; content: string }>;
          };

          const sent = callArgs.messages;

          // The prior summary must appear somewhere in the sent messages
          const hasSummary = sent.some(
            (m: { role: string; content: string }) =>
              m.role === "system" && m.content.includes(priorSummary)
          );
          expect(hasSummary).toBe(true);

          // It must come BEFORE the conversation messages (i.e. before any
          // user/assistant messages)
          const summaryIndex = sent.findIndex(
            (m: { role: string; content: string }) =>
              m.role === "system" && m.content.includes(priorSummary)
          );
          const firstConversationIndex = sent.findIndex(
            (m: { role: string }) => m.role === "user" || m.role === "assistant"
          );

          if (firstConversationIndex !== -1) {
            expect(summaryIndex).toBeLessThan(firstConversationIndex);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("no summary message is added when priorSummary is undefined", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(nonSystemMessageArb, { minLength: 0, maxLength: 10 }),
        async (messages) => {
          mockCreate.mockResolvedValue(MOCK_STREAM);

          await streamChatResponse(messages, undefined);

          const callArgs = mockCreate.mock.lastCall![0] as {
            messages: Array<{ role: string; content: string }>;
          };

          const sent = callArgs.messages;

          // Only one system message — the coaching prompt. No summary injection.
          const systemMessages = sent.filter(
            (m: { role: string }) => m.role === "system"
          );
          expect(systemMessages).toHaveLength(1);
          expect(systemMessages[0].content).toBe(COACHING_SYSTEM_PROMPT);
        }
      ),
      { numRuns: 30 }
    );
  });
});

// ─── Property 8: Session summary structural completeness ─────────────────────
//
// For any conversation history, generateSessionSummary must always return an
// object with nextActionSteps, strugglesDiscussed, and backupPlans — all
// non-empty string arrays when OpenAI returns valid data.

describe("Property 8: Session summary structural completeness", () => {
  beforeEach(() => vi.clearAllMocks());

  it("all three summary fields are non-empty string arrays when OpenAI returns valid JSON", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(nonSystemMessageArb, { minLength: 1, maxLength: 10 }),
        fc.array(fc.string({ minLength: 1, maxLength: 80 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.string({ minLength: 1, maxLength: 80 }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.string({ minLength: 1, maxLength: 80 }), { minLength: 1, maxLength: 5 }),
        async (messages, nextActionSteps, strugglesDiscussed, backupPlans) => {
          const mockResponse = JSON.stringify({
            nextActionSteps,
            strugglesDiscussed,
            backupPlans,
          });

          mockCreate.mockResolvedValue({
            choices: [{ message: { content: mockResponse } }],
          });

          const result = await generateSessionSummary(messages);

          expect(Array.isArray(result.nextActionSteps)).toBe(true);
          expect(Array.isArray(result.strugglesDiscussed)).toBe(true);
          expect(Array.isArray(result.backupPlans)).toBe(true);

          expect(result.nextActionSteps).toEqual(nextActionSteps);
          expect(result.strugglesDiscussed).toEqual(strugglesDiscussed);
          expect(result.backupPlans).toEqual(backupPlans);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("returns empty arrays for all fields when OpenAI returns malformed JSON", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "not-valid-json{{" } }],
    });

    const result = await generateSessionSummary([
      { role: MessageRole.USER, content: "hello" },
    ]);

    expect(result.nextActionSteps).toEqual([]);
    expect(result.strugglesDiscussed).toEqual([]);
    expect(result.backupPlans).toEqual([]);
  });

  it("filters out non-string entries from arrays in the OpenAI response", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              nextActionSteps: ["valid step", 42, null, "another step"],
              strugglesDiscussed: [true, "real struggle"],
              backupPlans: ["plan b"],
            }),
          },
        },
      ],
    });

    const result = await generateSessionSummary([
      { role: MessageRole.USER, content: "test" },
    ]);

    expect(result.nextActionSteps).toEqual(["valid step", "another step"]);
    expect(result.strugglesDiscussed).toEqual(["real struggle"]);
    expect(result.backupPlans).toEqual(["plan b"]);
  });
});
