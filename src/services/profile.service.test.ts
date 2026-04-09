import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";
import type { UserProfile } from "@/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { getProfile, upsertProfile, extractAndPersistGoals } from "./profile.service";

// Cast to vi.Mock so we can use mockImplementation without fighting Prisma's
// complex input types. The mock itself is a vi.fn() — the cast is safe.
const mockFindUnique = prisma.userProfile.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockUpsert = prisma.userProfile.upsert as unknown as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.message.findMany as unknown as ReturnType<typeof vi.fn>;
const mockOpenAI = openai.chat.completions.create as unknown as ReturnType<typeof vi.fn>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProfile(userId: string, overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "profile-1",
    userId,
    age: null,
    weightKg: null,
    heightCm: null,
    goals: [],
    dietaryRestrictions: [],
    healthConditions: [],
    activityLevel: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

// ─── Property 9: Profile data round-trip ──────────────────────────────────────
//
// For any combination of goal and habit (healthConditions) arrays:
//   upsertProfile → getProfile must return exactly the values that were stored.
//
// This proves the service does no silent transformation, truncation, or
// de-duplication of user-supplied data.

describe("Property 9: Profile data round-trip", () => {
  const userId = "user-abc";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getProfile returns exactly what upsertProfile stored for any goal and habit arrays", async () => {
    await fc.assert(
      fc.asyncProperty(
        // goals: array of non-empty printable strings
        fc.array(fc.string({ minLength: 1, maxLength: 80 }).filter(s => /^[\x20-\x7E]+$/.test(s)), {
          minLength: 0,
          maxLength: 10,
        }),
        // healthConditions (the "habits" in the property description — lifestyle
        // conditions that shape the coaching approach)
        fc.array(fc.string({ minLength: 1, maxLength: 80 }).filter(s => /^[\x20-\x7E]+$/.test(s)), {
          minLength: 0,
          maxLength: 10,
        }),
        async (goals, healthConditions) => {
          // Simulate the DB: upsert stores, findUnique reads back the same record.
          let stored: UserProfile | null = null;

          mockUpsert.mockImplementation(
            async (args: { create: Partial<UserProfile>; update: Partial<UserProfile> }) => {
              stored = makeProfile(userId, stored ? args.update : args.create);
              return stored;
            }
          );

          mockFindUnique.mockImplementation(async () => stored);

          // Store
          await upsertProfile(userId, { goals, healthConditions });

          // Retrieve
          const retrieved = await getProfile(userId);

          // Assert deep equality on the stored arrays
          expect(retrieved?.goals).toEqual(goals);
          expect(retrieved?.healthConditions).toEqual(healthConditions);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("getProfile returns null when no profile exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await getProfile("unknown-user");
    expect(result).toBeNull();
  });
});

// ─── extractAndPersistGoals ───────────────────────────────────────────────────

describe("extractAndPersistGoals", () => {
  const userId = "user-abc";
  const sessionId = "session-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists goals extracted from the OpenAI response", async () => {
    const extracted = ["eat more vegetables", "drink 2L of water daily"];

    mockFindMany.mockResolvedValue([
      { id: "m1", sessionId, role: "USER", content: "I want to eat better.", createdAt: new Date(), updatedAt: new Date() } as never,
      { id: "m2", sessionId, role: "ASSISTANT", content: "Great goal!", createdAt: new Date(), updatedAt: new Date() } as never,
    ]);

    mockOpenAI.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ goals: extracted }) } }],
    } as never);

    const stored = makeProfile(userId, { goals: extracted });
    mockUpsert.mockResolvedValue(stored);

    const result = await extractAndPersistGoals(userId, sessionId);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ goals: extracted }),
      })
    );
    expect(result.goals).toEqual(extracted);
  });

  it("persists an empty goals array when OpenAI returns malformed JSON", async () => {
    mockFindMany.mockResolvedValue([
      { id: "m1", sessionId, role: "USER", content: "Hello", createdAt: new Date(), updatedAt: new Date() } as never,
    ]);

    mockOpenAI.mockResolvedValue({
      choices: [{ message: { content: "not-valid-json" } }],
    } as never);

    const stored = makeProfile(userId, { goals: [] });
    mockUpsert.mockResolvedValue(stored);

    const result = await extractAndPersistGoals(userId, sessionId);
    expect(result.goals).toEqual([]);
  });

  it("persists an empty goals array when the session has no messages", async () => {
    mockFindMany.mockResolvedValue([]);
    const stored = makeProfile(userId, { goals: [] });
    mockUpsert.mockResolvedValue(stored);

    await extractAndPersistGoals(userId, sessionId);

    expect(mockOpenAI).not.toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { goals: [] } })
    );
  });
});
