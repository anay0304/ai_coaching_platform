import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import fc from "fast-check";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// The page now calls getResources() from the resource service rather than
// importing Prisma directly. We mock at the service boundary so the test
// receives arbitrary data without a real database connection.
vi.mock("@/services/resource.service", () => ({
  getResources: vi.fn(),
}));

import { getResources } from "@/services/resource.service";
import ResourcesPage from "./page";

const mockFindMany = getResources as unknown as ReturnType<typeof vi.fn>;

// ─── Arbitraries ──────────────────────────────────────────────────────────────

// Only printable ASCII with no leading/trailing whitespace.
// • Avoids control characters that browsers strip from textContent.
// • Ensures s.trim() === s, so the ResourceCard's trim() call doesn't change
//   the value and the assertion `textContent.includes(s)` always holds.
const printableString = (opts?: { minLength?: number; maxLength?: number }) =>
  fc
    .string({ minLength: opts?.minLength ?? 1, maxLength: opts?.maxLength ?? 80 })
    .filter((s) => /^[\x20-\x7E]+$/.test(s) && s.trim() === s && s.length > 0);

// A Resource record shaped exactly as Prisma returns it.
const resourceArb = fc.record({
  // id is overridden in the test to be index-based, so duplicates don't matter
  // here — but we still keep the field to satisfy the type.
  id: fc.string({ minLength: 1, maxLength: 20 }),
  title: printableString({ minLength: 1, maxLength: 80 }),
  // printableString already guarantees s.trim() === s and s.length > 0, so the
  // card renders content exactly as-is (trim is a no-op) and the assertion holds.
  content: printableString({ minLength: 1, maxLength: 200 }),
  category: printableString({ minLength: 1, maxLength: 40 }),
  tags: fc.array(printableString({ maxLength: 20 }), { maxLength: 5 }),
  createdAt: fc.constant(new Date("2024-01-01")),
  updatedAt: fc.constant(new Date("2024-01-01")),
});

// ─── Property 10: Resources data-driven rendering ─────────────────────────────
//
// For any list of resource records returned by the DB:
//   • Every resource's title appears in the rendered page.
//   • Every resource's description content appears in the rendered page.
//
// This proves ResourcesPage and ResourceCard render data-driven content
// correctly regardless of what is stored in the database.

describe("Property 10: Resources data-driven rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders every resource title and description for any resource list", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(resourceArb, { minLength: 1, maxLength: 15 }),
        async (rawResources) => {
          // Replace ids with index-based values so React keys are always unique.
          // fast-check can generate duplicate id strings, which would cause React
          // to skip rendering one of the duplicates and break the assertion.
          const resources = rawResources.map((r, i) => ({
            ...r,
            id: `resource-${i}`,
          }));

          mockFindMany.mockResolvedValue(resources);

          // ResourcesPage is an async Server Component — awaiting it returns
          // the JSX tree with the data already baked in (no live DB needed).
          const jsx = await ResourcesPage();
          const { container } = render(jsx);

          // Every title and its description must be present in the page text.
          for (const resource of resources) {
            expect(container.textContent).toContain(resource.title);
            expect(container.textContent).toContain(resource.content);
          }

          // Clean up the rendered tree between fast-check iterations so DOM
          // nodes from one run don't bleed into the next.
          cleanup();
        }
      ),
      { numRuns: 50 }
    );
  });

  it("shows the unavailable message when a resource has empty content", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "r1",
        title: "Empty Resource",
        content: "",
        category: "Test",
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const jsx = await ResourcesPage();
    const { getByRole } = render(jsx);

    // The ResourceCard renders role="alert" with the unavailability message.
    expect(getByRole("alert")).toBeInTheDocument();
    expect(getByRole("alert").textContent).toContain("currently unavailable");
  });

  it("shows the empty-state message when there are no resources", async () => {
    mockFindMany.mockResolvedValue([]);

    const jsx = await ResourcesPage();
    const { container } = render(jsx);

    expect(container.textContent).toContain("No resources available yet");
  });
});
