import { MessageRole } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  role: MessageRole;
  content: string;
  /** When true, renders an animated "…" indicator instead of finished content. */
  isStreaming?: boolean;
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

export default function MessageBubble({
  role,
  content,
  isStreaming = false,
}: MessageBubbleProps) {
  const isUser = role === MessageRole.USER;

  return (
    <div
      className={[
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
      ].join(" ")}
    >
      <div
        className={[
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-sm bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
            : "rounded-bl-sm bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50",
        ].join(" ")}
      >
        {isStreaming ? (
          /* Animated typing indicator shown while the AI response streams in */
          <span className="inline-flex items-center gap-1" aria-label="Typing">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
          </span>
        ) : (
          /* Preserve newlines in multi-paragraph coach responses */
          <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>
        )}
      </div>
    </div>
  );
}
