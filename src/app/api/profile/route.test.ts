import { describe, it, expect, vi, beforeEach } from "vitest";
import fc from "fast-check";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/services/auth.service", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userProfile: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/services/profile.service", () => ({
  getProfile: vi.fn(),
  upsertProfile: vi.fn(),
}));

import { getServerSession } from "@/services/auth.service";
import { prisma } from "@/lib/prisma";
import { getProfile, upsertProfile } from "@/services/profile.service";
import { GET, PATCH } from "./route";

const mockSession = vi.mocked(getServerSession);
const mockFindUser = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockGetProfile = vi.mocked(getProfile);
const mockUpsertProfile = vi.mocked(upsertProfile);

// A minimal valid session for a real (non-demo) user
const REAL_SESSION = {
  user: { id: "real-user-id", email: "real@example.com", name: "Real User" },
  expires: "9999-12-31",
};

// A minimal valid session for the demo user
const DEMO_SESSION = {
  user: { id: "demo-user-id", email: "demo@example.com", name: "Demo User" },
  expires: "9999-12-31",
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── GET ──────────────────────────────────────────────────────────────────────

describe("GET /api/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the profile when authenticated", async () => {
    const profile = { id: "p1", userId: "real-user-id", goals: ["eat better"] };
    mockSession.mockResolvedValue(REAL_SESSION as never);
    mockGetProfile.mockResolvedValue(profile as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.goals).toEqual(["eat better"]);
  });

  it("returns empty object when no profile exists yet", async () => {
    mockSession.mockResolvedValue(REAL_SESSION as never);
    mockGetProfile.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({});
  });
});

// ─── PATCH ────────────────────────────────────────────────────────────────────

describe("PATCH /api/profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockSession.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ goals: ["eat better"] }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for malformed JSON body", async () => {
    mockSession.mockResolvedValue(REAL_SESSION as never);
    const bad = new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{",
    });
    const res = await PATCH(bad);
    expect(res.status).toBe(400);
  });

  it("updates profile fields for a real user", async () => {
    const updated = { id: "p1", userId: "real-user-id", goals: ["drink water"] };
    mockSession.mockResolvedValue(REAL_SESSION as never);
    mockUpsertProfile.mockResolvedValue(updated as never);

    const res = await PATCH(makeRequest({ goals: ["drink water"] }));
    expect(res.status).toBe(200);
    expect(mockUpsertProfile).toHaveBeenCalledWith(
      "real-user-id",
      expect.objectContaining({ goals: ["drink water"] })
    );
  });
});

// ─── Property 12: Demo user credential immutability ───────────────────────────
//
// For any payload that contains an email or password field, a demo user must
// receive a 403 and the database must not be written to.
//
// "Credential" means email or password — fields that belong to the User model,
// not the UserProfile. This property proves the demo guard fires for every
// possible credential payload shape, not just the ones we thought to test.

describe("Property 12: Demo user credential immutability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("always returns 403 and never writes to DB when demo user sends credentials", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate payloads that contain at least one credential field.
        // fc.oneof picks one of the three shapes.
        fc.oneof(
          fc.record({ email: fc.emailAddress() }),
          fc.record({ password: fc.string({ minLength: 1 }) }),
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 1 }),
          })
        ),
        // Optionally mix in valid profile fields to confirm they don't bypass the guard
        fc.record({
          goals: fc.option(
            fc.array(fc.string({ minLength: 1 }), { maxLength: 3 }),
            { nil: undefined }
          ),
        }),
        async (credentialFields, profileFields) => {
          const payload = {
            ...profileFields.goals !== undefined ? { goals: profileFields.goals } : {},
            ...credentialFields,
          };

          mockSession.mockResolvedValue(DEMO_SESSION as never);
          mockFindUser.mockResolvedValue({ isDemo: true });

          const res = await PATCH(makeRequest(payload));

          // Must be 403 — demo user cannot modify credentials
          expect(res.status).toBe(403);

          const body = await res.json() as { error: string };
          expect(typeof body.error).toBe("string");
          expect(body.error.length).toBeGreaterThan(0);

          // Database must not have been written to
          expect(mockUpsertProfile).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  it("allows demo user to update profile-only fields (no credentials)", async () => {
    const updated = { id: "p1", userId: "demo-user-id", goals: ["feel better"] };
    mockSession.mockResolvedValue(DEMO_SESSION as never);
    mockUpsertProfile.mockResolvedValue(updated as never);

    // No credential fields — no isDemo check needed
    const res = await PATCH(makeRequest({ goals: ["feel better"] }));
    expect(res.status).toBe(200);
    // isDemo lookup was not triggered (no credential field in body)
    expect(mockFindUser).not.toHaveBeenCalled();
  });
});
