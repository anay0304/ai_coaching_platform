🧠 NutriCoach — AI Nutrition Coaching Platform

A full-stack AI-powered coaching system that helps users build sustainable nutrition habits through structured, behavior-driven conversations — not rigid meal plans.

🚀 Overview

NutriCoach is a production-style AI coaching application that simulates real-world nutrition coaching sessions using conversational AI, persistent memory, and structured behavioral frameworks.

Unlike traditional calorie trackers or meal planners, NutriCoach focuses on long-term habit change, guiding users through personalized coaching sessions that evolve over time.

The platform supports:

Real-time AI coaching conversations
Persistent session history and summaries
Goal extraction and user profiling
Structured coaching workflows (initial onboarding + check-ins)

Built using modern full-stack technologies, the app demonstrates end-to-end product thinking, from authentication and database design to AI integration and deployment.

💡 Problem & Approach

Most nutrition apps fail because they:

Overwhelm users with rigid plans
Ignore behavioral psychology
Don’t adapt to user context over time

NutriCoach solves this by acting as a behavior-first coach.

Instead of prescribing actions, the AI:

asks targeted, reflective questions
adapts to user responses
extracts goals automatically
reinforces small, sustainable habits
summarizes progress across sessions

This mimics how real coaches operate — making the experience personal, adaptive, and scalable.

✨ Key Features

🤖 AI Coaching Engine
Real-time streamed AI responses (OpenAI API)
Context-aware conversations using prior session summaries
Structured session types:
INITIAL (onboarding)
CHECKIN (progress tracking)
ONGOING

🧠 Persistent Coaching Memory
Stores full conversation history
Generates structured session summaries:
goals
struggles
next steps
fallback plans
Automatically extracts and updates user goals

🔐 Authentication & User Management
Secure credential-based authentication (NextAuth)
Protected routes and session handling (JWT-based)
Demo account with safe guardrails

📊 Dashboard & User Experience
Session tracking and progress overview
Coaching history with individual session views
Personalized resources and educational content

🧪 Testing & Reliability
Unit + integration testing with Vitest
End-to-end testing with Playwright
Coverage across services, APIs, and UI flows

☁️ Deployment Ready
Cloudflare deployment via OpenNext + Wrangler
Environment validation and secure secrets handling

🏗️ System Architecture

This project is designed with clear separation of concerns, similar to production-grade applications:

Frontend: Next.js (App Router), React, Tailwind CSS
Backend: API routes + service layer abstraction
Database: PostgreSQL (Prisma ORM)
Auth: NextAuth (credentials + JWT sessions)
AI Layer: OpenAI API with structured prompt orchestration
Core Domain Models
User
UserProfile
CoachingSession
Message
SessionSummary
Resource

🔄 Coaching Session Lifecycle

User starts a session → IN_PROGRESS
Messages are stored and sent to the AI
AI responses are streamed to the UI
Session ends → marked COMPLETED
System generates a structured summary
Initial sessions → goals extracted into profile
Dashboard reflects updated progress
🧪 Demo Access

Try the app instantly using the demo account:

Email: demo@nutricoach.app
Password: demo1234
🛠️ Tech Stack
Frontend: Next.js 16, React 19, Tailwind CSS 4
Backend: TypeScript, API Routes, Service Layer
Database: PostgreSQL + Prisma ORM
Authentication: NextAuth
AI Integration: OpenAI API
Testing: Vitest, Testing Library, Playwright
Deployment: Cloudflare (OpenNext + Wrangler)
