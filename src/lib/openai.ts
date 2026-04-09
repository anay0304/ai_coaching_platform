import OpenAI from "openai";
import { env } from "./env";

// Same globalThis guard as prisma.ts — prevents creating a new client on every
// hot-reload in development.
const globalForOpenAI = globalThis as unknown as {
  openai: OpenAI | undefined;
};

export const openai =
  globalForOpenAI.openai ?? new OpenAI({ apiKey: env.OPENAI_API_KEY });

if (process.env.NODE_ENV !== "production") {
  globalForOpenAI.openai = openai;
}
