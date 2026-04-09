import { getServerSession } from "@/services/auth.service";
import { getSession, addMessage, getLatestSummary } from "@/services/session.service";
import { streamChatResponse } from "@/services/ai.service";
import { MessageRole } from "@/types";

type Params = Promise<{ sessionId: string }>;

// ─── POST /api/sessions/[sessionId]/messages ──────────────────────────────────
//
// 1. Validate auth and session ownership.
// 2. Parse + persist the user's message.
// 3. Load the prior session summary (if any) so the AI has memory across sessions.
// 4. Stream the AI reply back as Server-Sent Events (SSE).
// 5. Once the stream ends, persist the completed assistant message.
//
// SSE format:
//   data: <chunk text>\n\n      — one or more content chunks
//   data: [DONE]\n\n            — signals end of stream to the client

export async function POST(
  request: Request,
  { params }: { params: Params }
): Promise<Response> {
  const authSession = await getServerSession();
  if (!authSession) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  const coachingSession = await getSession(sessionId);
  if (!coachingSession) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  if (coachingSession.userId !== authSession.user.id) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse the request body.
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const { content } = body;
  if (typeof content !== "string" || content.trim().length === 0) {
    return Response.json({ error: "content must be a non-empty string" }, { status: 400 });
  }

  // Persist the user's message first.
  // If OpenAI later fails, the user message stays in the DB so the client does
  // not need to re-send it (per requirement: do not clear user message on error).
  await addMessage(sessionId, MessageRole.USER, content);

  // Build the conversation history to send to OpenAI.
  // Re-fetch the session so the new user message is included.
  const sessionWithMessages = await getSession(sessionId);
  const chatHistory = (sessionWithMessages?.messages ?? []).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Retrieve the most recent session summary so the AI remembers prior context.
  const latestSummary = await getLatestSummary(authSession.user.id);
  const priorSummary = latestSummary?.content ?? undefined;

  // Start streaming — errors here are caught and returned as 500.
  let aiStream: Awaited<ReturnType<typeof streamChatResponse>>;
  try {
    aiStream = await streamChatResponse(chatHistory, priorSummary);
  } catch {
    return Response.json(
      { error: "The AI service is unavailable. Please try again in a moment." },
      { status: 500 }
    );
  }

  // Build an SSE ReadableStream that:
  //   • Iterates the OpenAI stream chunk by chunk.
  //   • Sends each text delta as `data: <chunk>\n\n`.
  //   • Accumulates the full response so we can persist it when done.
  //   • Sends `data: [DONE]\n\n` and persists the assistant message at the end.
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let assistantContent = "";
      try {
        for await (const chunk of aiStream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            assistantContent += delta;
            controller.enqueue(encoder.encode(`data: ${delta}\n\n`));
          }
        }

        // Stream finished — persist the completed assistant message.
        if (assistantContent) {
          await addMessage(sessionId, MessageRole.ASSISTANT, assistantContent);
        }
      } catch {
        // If the stream breaks mid-way, signal the client and end cleanly.
        // The user message is already saved; the assistant message is not saved
        // because we only have a partial response.
        controller.enqueue(
          encoder.encode(
            "data: [ERROR] The AI response was interrupted. Please try again.\n\n"
          )
        );
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
