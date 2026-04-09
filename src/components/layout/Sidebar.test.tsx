import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Sidebar from "./Sidebar";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// next/navigation is a Next.js server/client hook — it doesn't exist in jsdom.
// We mock usePathname so we can control which link appears active.
vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/dashboard"),
}));

// next/link renders as a router-aware component in real Next.js but requires
// router context we don't have in jsdom. We replace it with a plain <a>.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    "aria-current": ariaCurrent,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    "aria-current"?: "page" | "step" | "location" | "date" | "time" | boolean;
  }) => (
    <a href={href} className={className} aria-current={ariaCurrent}>
      {children}
    </a>
  ),
}));

// next-auth/react provides browser-side auth helpers. In tests we only need to
// confirm that the Sign Out button exists — we don't need it to actually fire.
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Sidebar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders all three navigation items", () => {
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Coaching" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resources" })).toBeInTheDocument();
  });

  it("renders a Sign Out button", () => {
    render(<Sidebar />);
    expect(
      screen.getByRole("button", { name: "Sign Out" })
    ).toBeInTheDocument();
  });

  it("marks the active link with aria-current=page", () => {
    render(<Sidebar />);
    // usePathname is mocked to "/dashboard" so Dashboard should be active
    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboardLink).toHaveAttribute("aria-current", "page");

    // The other links must NOT be marked active
    expect(screen.getByRole("link", { name: "Coaching" })).not.toHaveAttribute(
      "aria-current"
    );
    expect(
      screen.getByRole("link", { name: "Resources" })
    ).not.toHaveAttribute("aria-current");
  });

  it("matches snapshot for an authenticated user on /dashboard", () => {
    const { container } = render(<Sidebar />);
    expect(container).toMatchSnapshot();
  });
});
