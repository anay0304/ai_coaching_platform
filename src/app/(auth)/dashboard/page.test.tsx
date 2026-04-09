import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import fc from "fast-check";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/services/auth.service", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/services/session.service", () => ({
  getSessionCount: vi.fn(),
  getLatestSummary: vi.fn(),
}));

vi.mock("@/services/profile.service", () => ({
  getProfile: vi.fn(),
}));

// next/navigation — redirect must not throw so the page renders normally.
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// next/link — render as a plain anchor in jsdom.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import { getServerSession } from "@/services/auth.service";
import { getSessionCount, getLatestSummary } from "@/services/session.service";
import { getProfile } from "@/services/profile.service";
import DashboardPage from "./page";

const mockGetServerSession = getServerSession as unknown as ReturnType<typeof vi.fn>;
const mockGetSessionCount = getSessionCount as unknown as ReturnType<typeof vi.fn>;
const mockGetLatestSummary = getLatestSummary as unknown as ReturnType<typeof vi.fn>;
const mockGetProfile = getProfile as unknown as ReturnType<typeof vi.fn>;

const FAKE_SESSION = {
  user: { id: "user-1", name: "Test User", email: "test@test.com" },
};

// ─── Property 11: Dashboard session count accuracy ────────────────────────────
//
// For any integer n ≥ 1, if the database reports n COMPLETED sessions, the
// dashboard must display exactly that number.

describe("Property 11: Dashboard session count accuracy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue(FAKE_SESSION);
    mockGetLatestSummary.mockResolvedValue(null);
    mockGetProfile.mockResolvedValue(null);
  });

  it("displays the exact completed-session count returned by the service", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        async (n) => {
          // Both the "completed" and "total" calls return n so totalCount > 0
          // (prevents the empty-state branch from rendering).
          mockGetSessionCount.mockResolvedValue(n);

          const jsx = await DashboardPage();
          const { container } = render(jsx);

          expect(container.textContent).toContain(String(n));

          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Snapshot 16.3: Dashboard "no sessions" state ────────────────────────────
//
// When the user has never had a session the page shows a "Start your Initial
// Session" CTA. This snapshot locks that structure in place.

describe('Dashboard "no sessions" state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerSession.mockResolvedValue(FAKE_SESSION);
    // Both total and completed counts are 0 → triggers the empty-state branch.
    mockGetSessionCount.mockResolvedValue(0);
    mockGetLatestSummary.mockResolvedValue(null);
    mockGetProfile.mockResolvedValue(null);
  });

  it('renders the "Start your Initial Session" prompt', async () => {
    const jsx = await DashboardPage();
    const { getByRole, container } = render(jsx);

    expect(container.textContent).toContain("Start your Initial Session");
    expect(
      getByRole("link", { name: /start.*initial session/i })
    ).toBeInTheDocument();
    expect(
      getByRole("link", { name: /start.*initial session/i })
    ).toHaveAttribute("href", "/coaching");
  });

  it("matches snapshot", async () => {
    const jsx = await DashboardPage();
    const { container } = render(jsx);
    expect(container).toMatchSnapshot();
  });
});
