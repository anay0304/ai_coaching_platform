import Link from "next/link";
import type { CoachingSession } from "@/types";
import { SessionType, SessionStatus } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<SessionType, string> = {
  [SessionType.INITIAL]: "Initial Session",
  [SessionType.CHECKIN]: "Check-In",
  [SessionType.ONGOING]: "Coaching Session",
};

const STATUS_STYLES: Record<SessionStatus, string> = {
  [SessionStatus.IN_PROGRESS]:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  [SessionStatus.COMPLETED]:
    "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  [SessionStatus.ARCHIVED]:
    "bg-zinc-50 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500",
};

const STATUS_LABELS: Record<SessionStatus, string> = {
  [SessionStatus.IN_PROGRESS]: "In Progress",
  [SessionStatus.COMPLETED]: "Completed",
  [SessionStatus.ARCHIVED]: "Archived",
};

// ─── SessionList ──────────────────────────────────────────────────────────────

interface SessionListProps {
  sessions: CoachingSession[];
}

export default function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No sessions yet. Start one above!
      </p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {sessions.map((session) => (
        <li key={session.id}>
          <Link
            href={`/coaching/${session.id}`}
            className="flex items-center justify-between gap-4 px-1 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            {/* Left: type and date */}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {session.title ?? TYPE_LABELS[session.type]}
              </p>
              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                {new Date(session.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>

            {/* Right: status badge */}
            <span
              className={[
                "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                STATUS_STYLES[session.status],
              ].join(" ")}
            >
              {STATUS_LABELS[session.status]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
