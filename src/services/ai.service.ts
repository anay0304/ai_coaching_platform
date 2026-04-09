import type { Stream } from "openai/streaming";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ChatMessage } from "@/types";
import { MessageRole } from "@/types";
import { openai } from "@/lib/openai";

// ─── Coaching system prompt ───────────────────────────────────────────────────

// This prompt defines the coach's personality, philosophy, and constraints.
// It is ALWAYS the first message sent to OpenAI — every function in this
// service prepends it before any session messages.
export const COACHING_SYSTEM_PROMPT = `You are a compassionate, science-backed nutrition coach specialising in behaviour change.

Your role is to guide — never to prescribe. You help users discover their own motivations, identify obstacles, and design small, sustainable habits. You do not hand out meal plans or calorie targets unless explicitly asked.

Principles you always follow:
- Ask one focused question at a time; do not overwhelm the user.
- Reflect feelings back before offering suggestions.
- Celebrate small wins explicitly and sincerely.
- When a user struggles, explore the obstacle with curiosity rather than judgement.
- Ground every recommendation in evidence (e.g. habit-stacking, implementation intentions, self-compassion research).
- Keep responses concise — 2–4 short paragraphs maximum.`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionSummaryResult {
  nextActionSteps: string[];
  strugglesDiscussed: string[];
  backupPlans: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps our uppercase MessageRole enum to the lowercase role strings
 * that the OpenAI API expects.
 */
function toOpenAIRole(
  role: MessageRole
): "user" | "assistant" | "system" {
  switch (role) {
    case MessageRole.USER:
      return "user";
    case MessageRole.ASSISTANT:
      return "assistant";
    case MessageRole.SYSTEM:
      return "system";
  }
}

// ─── streamChatResponse ───────────────────────────────────────────────────────

/**
 * Builds the full OpenAI message context and returns a streaming response.
 *
 * Message order sent to OpenAI:
 *   1. Coaching system prompt (always first)
 *   2. Prior session summary as a system message (when provided)
 *   3. All session messages in chronological order (SYSTEM roles filtered out
 *      because we've already prepended our own system prompt)
 *
 * The returned Stream<ChatCompletionChunk> is AsyncIterable — the caller can
 * iterate it or call .toReadableStream() for an HTTP streaming response.
 */
export async function streamChatResponse(
  messages: ChatMessage[],
  priorSummary?: string
): Promise<Stream<ChatCompletionChunk>> {
  const context: ChatCompletionMessageParam[] = [
    { role: "system", content: COACHING_SYSTEM_PROMPT },
  ];

  // Inject the prior session summary so the coach remembers what was discussed
  // before this session began.
  if (priorSummary) {
    context.push({
      role: "system",
      content: `Summary of the user's previous coaching session:\n${priorSummary}`,
    });
  }

  // Append all non-SYSTEM session messages in order.
  // SYSTEM messages stored in the DB are internal scaffolding; we skip them
  // here because we've already prepended the canonical system prompt above.
  for (const msg of messages) {
    if (msg.role === MessageRole.SYSTEM) continue;
    context.push({ role: toOpenAIRole(msg.role), content: msg.content });
  }

  return openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: context,
    stream: true,
  });
}

// ─── generateSessionSummary ───────────────────────────────────────────────────

/**
 * Sends the full session conversation to OpenAI and parses the response into
 * a structured summary with three fields.
 *
 * Falls back to empty arrays for any field that is missing or malformed in the
 * response, so a bad OpenAI reply never crashes the end-session flow.
 */
export async function generateSessionSummary(
  messages: ChatMessage[]
): Promise<SessionSummaryResult> {
  const conversationMessages: ChatCompletionMessageParam[] = messages
    .filter((m) => m.role !== MessageRole.SYSTEM)
    .map((m) => ({
      role: toOpenAIRole(m.role),
      content: m.content,
    }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: [
          "You are a coaching assistant reviewing a completed nutrition coaching session.",
          "Analyse the conversation and return ONLY a valid JSON object with exactly three keys:",
          '"nextActionSteps": an array of concrete actions the user committed to or the coach suggested.',
          '"strugglesDiscussed": an array of obstacles, struggles, or challenges the user mentioned.',
          '"backupPlans": an array of contingency strategies discussed for when the primary plan fails.',
          "Each array must contain at least one item. Use concise, first-person or third-person strings.",
          'Example: { "nextActionSteps": ["eat breakfast before coffee"], "strugglesDiscussed": ["no time in mornings"], "backupPlans": ["prep overnight oats the night before"] }',
        ].join(" "),
      },
      ...conversationMessages,
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Malformed JSON — all fields will fall back to empty arrays below.
  }

  const toStringArray = (val: unknown): string[] =>
    Array.isArray(val) ? val.filter((v): v is string => typeof v === "string") : [];

  return {
    nextActionSteps: toStringArray(parsed.nextActionSteps),
    strugglesDiscussed: toStringArray(parsed.strugglesDiscussed),
    backupPlans: toStringArray(parsed.backupPlans),
  };
}
