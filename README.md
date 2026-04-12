# AI Nutrition Coaching Platform

NutriCoach is an AI-powered nutrition coaching platform built to support sustainable habit change through guided conversation, structured session tracking, and personalized follow-up. Users can create an account, chat with an AI nutrition coach, review past sessions, and access practical educational resources in one place.

The app combines a modern Next.js frontend with Prisma, PostgreSQL, NextAuth, and OpenAI to deliver a coaching workflow that feels conversational while still preserving useful structure like goals, summaries, and next steps.

## Why This Project Exists

Many nutrition tools focus on rigid meal plans or calorie tracking. NutriCoach takes a different approach: behavior change first.

Instead of prescribing, the AI coach is designed to:

- ask focused questions
- reflect user struggles with empathy
- guide users toward small, sustainable actions
- summarize progress across sessions
- retain context from prior conversations

## Core Features

- Email/password authentication with secure credential hashing
- Public landing page with login, signup, and a seeded demo account
- Protected dashboard for authenticated users
- AI coaching sessions with streamed chat responses
- Support for multiple session types: `INITIAL`, `CHECKIN`, and `ONGOING`
- Automatic session completion workflow with AI-generated summaries
- Goal extraction from completed initial sessions
- User profile storage for goals, activity level, health context, and dietary restrictions
- Resources page backed by seeded educational content
- Demo-user protections to prevent modifying shared credentials
- Unit and integration tests with Vitest
- End-to-end tests with Playwright
- Cloudflare deployment support via OpenNext and Wrangler

## Product Flow

1. A user lands on the public homepage and logs in, signs up, or uses the demo account.
2. After authentication, the user enters the dashboard.
3. The user can start a new coaching session or check-in from the coaching area.
4. Messages are saved to the database and sent to OpenAI for a streamed AI response.
5. When the session ends, the app generates a structured summary and stores key insights.
6. If the session was an initial onboarding session, the app also extracts user goals and stores them in the profile.
7. The dashboard surfaces progress through session counts, goals, and recent action insights.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma ORM
- PostgreSQL
- NextAuth credentials authentication
- OpenAI API
- Vitest + Testing Library
- Playwright
- OpenNext for Cloudflare
- Wrangler for deployment

## Project Structure

```text
.
|-- prisma/
|   |-- schema.prisma
|   `-- seed.ts
|-- e2e/
|   `-- Playwright end-to-end tests
|-- src/
|   |-- app/
|   |   |-- (public)/          # Landing, login, signup
|   |   |-- (auth)/            # Protected app pages
|   |   `-- api/               # Route handlers
|   |-- components/            # UI components
|   |-- lib/                   # Env, Prisma, OpenAI clients
|   |-- services/              # Business logic layer
|   |-- test/                  # Test setup
|   `-- types/                 # Shared app types
|-- open-next.config.ts
|-- wrangler.jsonc
`-- package.json
```

## Architecture Notes

The project is structured around a clear separation of concerns:

- `src/app` contains pages, layouts, and route handlers
- `src/components` contains reusable UI building blocks
- `src/services` holds domain logic for auth, sessions, AI, profile management, and resources
- `src/lib` centralizes environment validation and singleton clients
- `prisma/schema.prisma` defines the database models and enums

### Main Data Models

- `User`
- `UserProfile`
- `CoachingSession`
- `Message`
- `SessionSummary`
- `Resource`

### Session Lifecycle

- A session is created with `IN_PROGRESS` status
- User and assistant messages are stored in the database
- AI replies are streamed back to the client over SSE
- Ending a session marks it `COMPLETED`
- A structured summary is generated and persisted
- Initial sessions also trigger goal extraction into the user profile

## Environment Variables

Copy `.env.example` to `.env.local` and provide values for:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."
```

## Local Development

Install dependencies:

```bash
npm install
```

Set up your database and environment variables, then run:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Database and Seeding

This project uses Prisma with PostgreSQL.

The seed script creates:

- a shared demo user
- a completed initial coaching session
- a stored session summary
- sample resource content
- a starter user profile for the demo account

Demo credentials:

- Email: `demo@nutricoach.app`
- Password: `demo1234`

## Testing

Run unit and integration tests:

```bash
npm test
```

Run coverage:

```bash
npm run test:coverage
```

Run Playwright end-to-end tests:

```bash
npx playwright test
```

The test suite covers:

- environment validation
- auth services
- AI services
- session and profile services
- API route handlers
- dashboard/resources page behavior
- sidebar rendering
- signup, demo login, and session E2E flows

## Deployment

This repository is configured for Cloudflare deployment using OpenNext.

Relevant scripts:

```bash
npm run cf:build
npm run cf:preview
npm run cf:deploy
```

Secrets such as `DATABASE_URL`, `NEXTAUTH_SECRET`, and `OPENAI_API_KEY` should be added through Wrangler secrets rather than committed to config files.

## Current Highlights

- AI conversation context includes the most recent prior session summary
- Session completion produces structured summaries with next steps, struggles, and backup plans
- Initial onboarding sessions can populate profile goals automatically
- Authenticated pages are protected at the middleware and layout levels
- The demo mode makes the project easy to evaluate without manual setup

## Roadmap Ideas

- richer profile editing UI
- clinician or coach admin tools
- analytics for adherence and habit trends
- better resource filtering and search
- real-time typing indicators and improved chat polish
- multi-provider authentication

## Summary

NutriCoach is a full-stack AI coaching application rather than a simple chat demo. It includes authentication, persistent session history, structured summaries, user profile memory, seeded demo content, testing coverage, and Cloudflare deployment support. The codebase already reflects a solid product foundation with clear service boundaries and a meaningful end-to-end user journey.
