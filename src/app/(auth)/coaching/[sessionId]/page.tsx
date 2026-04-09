import { notFound, redirect } from "next/navigation";
import { getServerSession } from "@/services/auth.service";
import { getSession } from "@/services/session.service";
import { SessionType } from "@/types";
import ChatInterface from "@/components/coaching/ChatInterface";

// ─── Types ────────────────────────────────────────────────────────────────────

type Params = Promise<{ sessionId: string }>;

// ─── SessionPage ──────────────────────────────────────────────────────────────

export default async function SessionPage({
  params,
}: {
  params: Params;
}) {
  const auth = await getServerSession();
  if (!auth) redirect("/");

  const { sessionId } = await params;
  const session = await getSession(sessionId);

  // 404 if the session doesn't exist; 403 if it belongs to someone else.
  if (!session) notFound();
  if (session.userId !== auth.user.id) notFound();

  const SESSION_TYPE_LABELS: Record<string, string> = {
    [SessionType.INITIAL]: "Initial Session",
    [SessionType.CHECKIN]: "Check-In",
    [SessionType.ONGOING]: "Coaching Session",
  };

  const title = session.title ?? SESSION_TYPE_LABELS[session.type] ?? "Session";

  return (
    <div className="flex h-full flex-col">

      {/* Session header */}
      <div className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
          Started{" "}
          {new Date(session.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Chat UI — Client Component receives initial messages from the server */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatInterface
          sessionId={session.id}
          initialMessages={session.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))}
        />
      </div>

    </div>
  );
}
