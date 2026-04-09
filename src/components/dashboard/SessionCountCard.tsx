// ─── SessionCountCard ─────────────────────────────────────────────────────────
//
// Displays the number of completed coaching sessions.

export default function SessionCountCard({ count }: { count: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Completed sessions
      </p>
      <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        {count}
      </p>
    </div>
  );
}
