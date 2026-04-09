import { redirect } from "next/navigation";
import { getServerSession } from "@/services/auth.service";
import { getUserSessions, createSession } from "@/services/session.service";
import { SessionType } from "@/types";
import SessionList from "@/components/coaching/SessionList";

// ─── Server Actions ───────────────────────────────────────────────────────────
//
// These run on the server when the user clicks a button. They create the new
// session in the database and then redirect the browser to the chat page.

async function startNewSession() {
  "use server";
  const auth = await getServerSession();
  if (!auth) redirect("/");
  const session = await createSession(auth.user.id, SessionType.ONGOING);
  redirect(`/coaching/${session.id}`);
}

async function startCheckIn() {
  "use server";
  const auth = await getServerSession();
  if (!auth) redirect("/");
  const session = await createSession(auth.user.id, SessionType.CHECKIN);
  redirect(`/coaching/${session.id}`);
}

// ─── CoachingPage ─────────────────────────────────────────────────────────────

export default async function CoachingPage() {
  const auth = await getServerSession();
  if (!auth) redirect("/");

  const sessions = await getUserSessions(auth.user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">

      {/* Header + action buttons */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Coaching Sessions
        </h1>
        <div className="flex gap-2">
          <form action={startCheckIn}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
            >
              New Check-In
            </button>
          </form>
          <form action={startNewSession}>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              New Session
            </button>
          </form>
        </div>
      </div>

      {/* Past sessions */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Past Sessions ({sessions.length})
          </h2>
        </div>
        <div className="px-4 py-2">
          <SessionList sessions={sessions} />
        </div>
      </div>

    </div>
  );
}
