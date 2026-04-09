import type { UserProfile } from "@/types";
import { MessageRole } from "@/types";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";

// ─── Types ────────────────────────────────────────────────────────────────────

// Only the fields the caller can write. id, userId, createdAt, updatedAt are
// managed by the database and not accepted as input.
export type ProfileInput = Partial<
  Pick<
    UserProfile,
    | "age"
    | "weightKg"
    | "heightCm"
    | "goals"
    | "dietaryRestrictions"
    | "healthConditions"
    | "activityLevel"
  >
>;

// ─── getProfile ───────────────────────────────────────────────────────────────

/**
 * Returns the UserProfile for the given user, or null if none exists yet.
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  return prisma.userProfile.findUnique({ where: { userId } });
}

// ─── upsertProfile ────────────────────────────────────────────────────────────

/**
 * Creates or updates the UserProfile for the given user with the provided
 * fields. Fields not included in `data` are left unchanged on update.
 */
export async function upsertProfile(
  userId: string,
  data: ProfileInput
): Promise<UserProfile> {
  return prisma.userProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: { ...data },
  });
}

// ─── extractAndPersistGoals ───────────────────────────────────────────────────

/**
 * Reads all messages from an INITIAL coaching session, sends them to OpenAI
 * with a goal-extraction prompt, and persists the resulting goals array on the
 * user's profile.
 *
 * Returns the updated profile.
 */
export async function extractAndPersistGoals(
  userId: string,
  sessionId: string
): Promise<UserProfile> {
  // Load the session's messages, excluding SYSTEM prompts (internal scaffolding
  // that the model shouldn't use as evidence of user intent).
  const messages = await prisma.message.findMany({
    where: {
      sessionId,
      role: { not: MessageRole.SYSTEM },
    },
    orderBy: { createdAt: "asc" },
  });

  if (messages.length === 0) {
    return upsertProfile(userId, { goals: [] });
  }

  // Build the conversation history for the extraction request.
  // OpenAI expects lowercase role strings (user/assistant), but our enum is
  // uppercase (USER/ASSISTANT), so we map each one.
  const conversationMessages = messages.map((m) => ({
    role: m.role.toLowerCase() as "user" | "assistant",
    content: m.content,
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: [
          "You are a nutrition coaching assistant reviewing a completed initial coaching session.",
          "Extract every goal, intention, and aspiration the USER expressed during the conversation.",
          "Return ONLY a valid JSON object with a single key: \"goals\", whose value is an array of concise, first-person goal strings.",
          "Example: { \"goals\": [\"lose 5 kg by summer\", \"eat breakfast every day\", \"reduce fast food to once a week\"] }",
        ].join(" "),
      },
      ...conversationMessages,
    ],
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  let goals: string[] = [];
  try {
    const parsed = JSON.parse(raw) as { goals?: unknown };
    if (Array.isArray(parsed.goals)) {
      goals = parsed.goals.filter((g): g is string => typeof g === "string");
    }
  } catch {
    // If OpenAI returns malformed JSON, persist an empty goals array rather
    // than crashing — the coach can re-run extraction on the next session.
    goals = [];
  }

  return upsertProfile(userId, { goals });
}
