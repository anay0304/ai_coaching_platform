import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/services/auth.service";
import { getSessionCount, getLatestSummary } from "@/services/session.service";
import { getProfile } from "@/services/profile.service";
import { SessionStatus } from "@/types";
import SessionCountCard from "@/components/dashboard/SessionCountCard";
import GoalsSummaryCard from "@/components/dashboard/GoalsSummaryCard";
import NextActionCard from "@/components/dashboard/NextActionCard";

// ─── DashboardPage ────────────────────────────────────────────────────────────
//
// Main landing page for authenticated users.
// • Shows "Start your Initial Session" CTA when the user has no sessions yet.
// • Otherwise displays session count, goals summary, and next action steps.

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/");

  const [completedCount, totalCount, latestSummary, profile] = await Promise.all([
    getSessionCount(session.user.id, SessionStatus.COMPLETED),
    getSessionCount(session.user.id),
    getLatestSummary(session.user.id),
    getProfile(session.user.id),
  ]);

  // ── No sessions yet ───────────────────────────────────────────────────────

  if (totalCount === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Welcome{session.user.name ? `, ${session.user.name}` : ""}! Ready to begin?
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            You haven&apos;t had a coaching session yet.
          </p>
          <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
            Your first session helps us understand your goals and build a
            personalised plan for you.
          </p>
          <Link
            href="/coaching"
            className="inline-flex items-center rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Start your Initial Session
          </Link>
        </div>
      </div>
    );
  }

  // ── Dashboard with data ───────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Welcome back{session.user.name ? `, ${session.user.name}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SessionCountCard count={completedCount} />
        <GoalsSummaryCard goals={profile?.goals ?? []} />
        <NextActionCard keyInsights={latestSummary?.keyInsights ?? null} />
      </div>
    </div>
  );
}
