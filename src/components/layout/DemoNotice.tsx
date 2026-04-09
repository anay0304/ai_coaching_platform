// ─── DemoNotice ───────────────────────────────────────────────────────────────
//
// Shown at the top of every authenticated page when the logged-in user is a
// demo account. Communicates that the account is shared and data may be reset.

export default function DemoNotice() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
    >
      <span aria-hidden="true">⚠</span>
      <span>
        <strong>Demo account</strong> — this account is shared and any data you
        enter may be reset at any time. Create a full account to save your
        progress.
      </span>
    </div>
  );
}
