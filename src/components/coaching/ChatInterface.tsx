"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageRole } from "@/types";
import type { SessionSummaryResult } from "@/services/ai.service";
import MessageBubble from "./MessageBubble";
import SessionSummaryCard from "./SessionSummaryCard";

// ─── Types ────────────────────────────────────────────────────────────────────

// A lightweight message shape used only in this component. createdAt is
// omitted intentionally — the Server Component passes dates as ISO strings
// after JSON serialisation, so we simply don't rely on them in the UI.
interface UIMessage {
  id: string;
  role: MessageRole;
  content: string;
}

interface ChatInterfaceProps {
  sessionId: string;
  initialMessages: UIMessage[];
}

// ─── ChatInterface ────────────────────────────────────────────────────────────

export default function ChatInterface({
  sessionId,
  initialMessages,
}: ChatInterfaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isEnding, setIsEnding] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [summary, setSummary] = useState<SessionSummaryResult | null>(null);

  // Keep the latest messages in a scroll container and auto-scroll to bottom.
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // ── Send a user message and stream the AI reply ───────────────────────────

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || isStreaming || sessionEnded) return;

    setError(null);
    setInput("");

    // Show the user's message in the UI immediately.
    const tempId = `local-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: MessageRole.USER, content },
    ]);

    // POST the message — the server persists it then streams the AI reply.
    let res: Response;
    try {
      res = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    } catch {
      // Network error: the message never reached the server, so restore input
      // so the user can retry without retyping.
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInput(content);
      setError("Could not reach the server. Please check your connection.");
      return;
    }

    if (!res.ok || !res.body) {
      // Server returned an error (e.g., 500 from OpenAI). The user message WAS
      // already saved to the DB, so we keep it in the display and do NOT
      // restore the input — it would be a duplicate if re-sent.
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(
        data.error ??
          "The AI service is unavailable. Please try again in a moment."
      );
      setIsStreaming(false);
      return;
    }

    // ── Read the SSE stream ───────────────────────────────────────────────────
    setIsStreaming(true);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by "\n\n". Split and process complete events.
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? ""; // Carry over any incomplete event.

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const data = part.slice(6); // strip "data: " prefix

          if (data === "[DONE]") {
            // Stream is complete — move the accumulated text into the message list.
            if (accumulated) {
              setMessages((prev) => [
                ...prev,
                {
                  id: `assistant-${Date.now()}`,
                  role: MessageRole.ASSISTANT,
                  content: accumulated,
                },
              ]);
            }
            setStreamingContent("");
            setIsStreaming(false);
            return;
          }

          if (data.startsWith("[ERROR]")) {
            setError(data.slice(7).trim());
            setStreamingContent("");
            setIsStreaming(false);
            return;
          }

          // Normal content chunk — append and update the streaming preview.
          accumulated += data;
          setStreamingContent(accumulated);
        }
      }
    } catch {
      setError("The AI response was interrupted. Please try again.");
    } finally {
      setStreamingContent("");
      setIsStreaming(false);
    }
  }

  // ── End the session ───────────────────────────────────────────────────────

  async function endSession() {
    if (isEnding || isStreaming || sessionEnded) return;
    setIsEnding(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/end`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Failed to end session. Please try again.");
        return;
      }

      const data = (await res.json()) as {
        summary: SessionSummaryResult;
      };
      setSummary(data.summary);
      setSessionEnded(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsEnding(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-3">
          {messages
            .filter((m) => m.role !== MessageRole.SYSTEM)
            .map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}

          {/* Live streaming preview */}
          {isStreaming && streamingContent && (
            <MessageBubble
              role={MessageRole.ASSISTANT}
              content={streamingContent}
            />
          )}

          {/* Animated "typing" dots shown before the first chunk arrives */}
          {isStreaming && !streamingContent && (
            <MessageBubble
              role={MessageRole.ASSISTANT}
              content=""
              isStreaming
            />
          )}

          {/* Session summary shown after ending */}
          {sessionEnded && summary && (
            <div className="py-4">
              <p className="mb-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                — Session ended —
              </p>
              <SessionSummaryCard {...summary} />
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => router.push("/coaching")}
                  className="rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Back to Coaching
                </button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {/* Input bar — hidden after session ends */}
      {!sessionEnded && (
        <div className="border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <form onSubmit={sendMessage} className="flex flex-1 items-end gap-2">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // Submit on Enter without Shift (Shift+Enter inserts newline)
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage(e as unknown as React.FormEvent);
                  }
                }}
                disabled={isStreaming}
                placeholder="Type a message…"
                className="flex-1 resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
              <button
                type="submit"
                disabled={isStreaming || !input.trim()}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Send
              </button>
            </form>

            <button
              type="button"
              onClick={() => void endSession()}
              disabled={isEnding || isStreaming}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
            >
              {isEnding ? "Ending…" : "End Session"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
