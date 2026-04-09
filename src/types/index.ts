import type {
  User,
  UserProfile,
  CoachingSession,
  Message,
  SessionSummary,
  Resource,
} from "@prisma/client";

import {
  SessionType,
  SessionStatus,
  MessageRole,
} from "@prisma/client";

// Re-export all database model types.
// The rest of the app imports from here — never directly from @prisma/client —
// so if the schema changes we only have one place to update.
export type { User, UserProfile, CoachingSession, Message, SessionSummary, Resource };

// Enums are both a TypeScript type (the union of string literals) and a
// JavaScript value (the const object you can do SessionType.INITIAL with).
// A single export covers both — no need to export type separately.
export { SessionType, SessionStatus, MessageRole };

// ─── AI chat layer ────────────────────────────────────────────────────────────

// ChatMessage represents a single turn in an ongoing AI conversation.
// It is intentionally lighter than the database Message model — it carries no
// id, sessionId, or createdAt, because it is used in places where we are
// building or streaming a conversation before (or instead of) persisting it.
export interface ChatMessage {
  role: MessageRole;
  content: string;
}
