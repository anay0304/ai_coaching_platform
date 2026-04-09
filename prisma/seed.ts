import { PrismaClient, SessionType, SessionStatus, MessageRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // ── Demo user ──────────────────────────────────────────────────────────────
  // Credentials must match the DEMO_EMAIL / DEMO_PASSWORD constants displayed
  // on the public landing page (src/app/(public)/page.tsx).
  const hashedPassword = await bcrypt.hash("demo1234", 12);

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@nutricoach.app" },
    update: { password: hashedPassword, isDemo: true },
    create: {
      email: "demo@nutricoach.app",
      name: "Demo User",
      password: hashedPassword,
      isDemo: true,
      profile: {
        create: {
          age: 32,
          weightKg: 78,
          heightCm: 175,
          goals: ["lose weight", "build healthy habits", "improve energy"],
          dietaryRestrictions: ["gluten-free"],
          healthConditions: [],
          activityLevel: "moderately active",
        },
      },
    },
  });

  console.log(`Seeded demo user: ${demoUser.email}`);

  // ── Pre-populated INITIAL coaching session ─────────────────────────────────
  const session = await prisma.coachingSession.upsert({
    where: { id: "seed-initial-session" },
    update: {},
    create: {
      id: "seed-initial-session",
      userId: demoUser.id,
      type: SessionType.INITIAL,
      status: SessionStatus.COMPLETED,
      title: "Your First Coaching Session",
      messages: {
        create: [
          {
            role: MessageRole.SYSTEM,
            content:
              "You are a compassionate, science-backed nutrition coach. Your role is to guide users through behaviour change, not to prescribe diets.",
          },
          {
            role: MessageRole.ASSISTANT,
            content:
              "Welcome! I'm really glad you're here. Before we dive in, I'd love to hear a little about you. What's been going on with your eating lately — and what made you decide to start this journey today?",
          },
          {
            role: MessageRole.USER,
            content:
              "I've been eating a lot of fast food because I'm always tired and busy. I want to eat better but I don't know where to start.",
          },
          {
            role: MessageRole.ASSISTANT,
            content:
              "That makes total sense — when energy is low, convenience wins every time, and there's no shame in that. You're clearly aware something needs to shift, which is the first step. Can you tell me what a typical day of eating looks like for you right now?",
          },
          {
            role: MessageRole.USER,
            content:
              "Usually I skip breakfast, grab a burger or pizza for lunch, then eat a big dinner because I'm starving.",
          },
          {
            role: MessageRole.ASSISTANT,
            content:
              "Thank you for sharing that — I can already see a pattern that's working against you. Skipping breakfast means you're running on empty all morning, which tanks energy and sets up cravings later. What if we just focused on one small change this week: adding a simple breakfast that takes under 5 minutes?",
          },
        ],
      },
      summary: {
        create: {
          content:
            "In this initial session, the user identified fatigue and busy schedule as the primary drivers of poor eating habits. The main pattern uncovered was skipping breakfast leading to energy crashes and overeating at dinner. The user is motivated to change but needs simple, low-effort starting points.",
          keyInsights: [
            "Skipping breakfast is contributing to low energy and evening overeating",
            "Convenience is the biggest barrier to healthy eating",
            "User is open to change and motivated — needs small, achievable first steps",
            "Focus area for next session: establish a quick, sustainable breakfast habit",
          ],
        },
      },
    },
  });

  console.log(`Seeded coaching session: ${session.title}`);

  // ── Resources ──────────────────────────────────────────────────────────────
  const resources = await prisma.$transaction([
    prisma.resource.upsert({
      where: { id: "seed-resource-1" },
      update: {},
      create: {
        id: "seed-resource-1",
        title: "Why Skipping Breakfast Backfires",
        category: "Meal Timing",
        tags: ["breakfast", "energy", "habit"],
        content: `Skipping breakfast might seem like an easy way to cut calories, but research consistently shows it often backfires. When you go without food in the morning, blood glucose drops, cortisol spikes, and cravings for high-fat, high-sugar foods increase significantly by mid-morning and afternoon.

A simple breakfast — even just Greek yoghurt with fruit, or eggs and toast — stabilises blood sugar, improves focus, and reduces the likelihood of overeating later in the day. You don't need a perfect meal; you just need something.

**Quick options under 5 minutes:**
- Greek yoghurt + handful of berries
- 2 boiled eggs (prep ahead) + a piece of fruit
- Overnight oats made the night before
- Peanut butter on wholegrain toast`,
      },
    }),
    prisma.resource.upsert({
      where: { id: "seed-resource-2" },
      update: {},
      create: {
        id: "seed-resource-2",
        title: "Building Healthy Habits That Stick",
        category: "Behaviour Change",
        tags: ["habits", "motivation", "behaviour change"],
        content: `Willpower is a limited resource — relying on it alone is a recipe for failure. The most effective nutrition changes are the ones that become automatic, requiring minimal decision-making.

The key is **habit stacking**: attaching a new behaviour to an existing one. For example, if you already make coffee every morning, make it a rule that you eat something before you finish your first cup.

**Principles for habits that last:**
1. **Start tiny** — a change so small it feels almost embarrassingly easy
2. **Stack it** — anchor it to a habit you already do reliably
3. **Make it satisfying** — track it, celebrate it, notice how you feel
4. **Expect slip-ups** — one bad day doesn't break a habit; skipping twice in a row does

Research by Dr. BJ Fogg and James Clear consistently shows that environment design beats motivation. Put the Greek yoghurt at eye level in the fridge. Remove the friction.`,
      },
    }),
  ]);

  console.log(`Seeded ${resources.length} resources`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
