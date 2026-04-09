import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/services/auth.service";
import { getProfile, upsertProfile } from "@/services/profile.service";
import type { ProfileInput } from "@/services/profile.service";

// Fields whose presence in a PATCH body counts as a credential change.
// These live on the User model, not UserProfile — this route handles the
// UserProfile only, so credential fields are always stripped before writing.
// But if a demo user sends them we reject the whole request with 403.
const CREDENTIAL_FIELDS = ["email", "password"] as const;

// ─── GET /api/profile ─────────────────────────────────────────────────────────

export async function GET(): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(session.user.id);
  return Response.json(profile ?? {});
}

// ─── PATCH /api/profile ───────────────────────────────────────────────────────

export async function PATCH(request: Request): Promise<Response> {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  // Check if the payload includes credential fields (email / password).
  const hasCredentialField = CREDENTIAL_FIELDS.some((f) => f in body);

  if (hasCredentialField) {
    // Load the user to check demo status. We do this only when a credential
    // field is present to avoid the extra DB round-trip on every PATCH.
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isDemo: true },
    });

    if (user?.isDemo) {
      return Response.json(
        {
          error:
            "Demo accounts cannot modify credentials. " +
            "Create a full account to save your own details.",
        },
        { status: 403 }
      );
    }
  }

  // Build the profile update — only accept the fields that belong to
  // UserProfile. Credential fields and unknown keys are dropped silently.
  const update: ProfileInput = {};

  if (Array.isArray(body.goals)) update.goals = body.goals as string[];
  if (Array.isArray(body.dietaryRestrictions))
    update.dietaryRestrictions = body.dietaryRestrictions as string[];
  if (Array.isArray(body.healthConditions))
    update.healthConditions = body.healthConditions as string[];
  if (typeof body.activityLevel === "string")
    update.activityLevel = body.activityLevel;
  if (typeof body.age === "number") update.age = body.age;
  if (typeof body.weightKg === "number") update.weightKg = body.weightKg;
  if (typeof body.heightCm === "number") update.heightCm = body.heightCm;

  const profile = await upsertProfile(session.user.id, update);
  return Response.json(profile);
}
