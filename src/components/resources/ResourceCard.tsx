import type { Resource } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true if the string looks like an http/https URL. */
function isUrl(s: string) {
  return s.startsWith("http://") || s.startsWith("https://");
}

// ─── ResourceCard ─────────────────────────────────────────────────────────────
//
// Displays a single Resource record.
//
// Content field behaviour:
//   • Empty/whitespace → show an "unavailable" error message (requirement 8.4)
//   • Starts with http(s):// → treat as an external file URL and render a link
//   • Anything else → render as plain description text (requirement 8.2)

interface ResourceCardProps {
  resource: Resource;
}

export default function ResourceCard({ resource }: ResourceCardProps) {
  const { title, content, category, tags } = resource;
  const trimmed = content.trim();
  const unavailable = trimmed === "";

  return (
    <article
      aria-label={title}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {/* Header: title + category badge */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
        {category && (
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {category}
          </span>
        )}
      </div>

      {/* Body */}
      {unavailable ? (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
        >
          This resource is currently unavailable. Please check back later.
        </p>
      ) : isUrl(trimmed) ? (
        <>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            External resource — click the link below to open or download.
          </p>
          <a
            href={trimmed}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-50"
          >
            Open Resource ↗
          </a>
        </>
      ) : (
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {trimmed}
        </p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
