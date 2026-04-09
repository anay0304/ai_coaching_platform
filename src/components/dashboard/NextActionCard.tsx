// ─── NextActionCard ───────────────────────────────────────────────────────────
//
// Shows the key insights (next action steps) from the user's most recent
// completed session summary. Populated after the first session ends.

export default function NextActionCard({
  keyInsights,
}: {
  keyInsights: string[] | null;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Next Actions
      </h2>

      {!keyInsights || keyInsights.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Next actions will appear after your first completed session.
        </p>
      ) : (
        <ul className="space-y-2">
          {keyInsights.map((insight, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <span className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true">
                →
              </span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
