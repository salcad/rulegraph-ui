import type { FirmId, GraphView, ReportBundle } from "./types";

// Base URL for the engine's web API. Empty by default, so the front end calls the same origin and a
// proxy (the Vite dev server, the nginx container, or a Vercel rewrite) forwards /api to the backend.
// Set VITE_API_BASE_URL to the backend's public URL to call it directly instead.
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

/**
 * Loads a firm's report bundle. It first asks the engine's web API to run the pipeline live; if the
 * backend is not reachable it falls back to the static bundle the engine exported (served from
 * public/data/). Either way the engine is the source of the figures.
 */
export async function loadReport(firm: FirmId): Promise<ReportBundle> {
  try {
    const live = await fetch(`${API_BASE}/api/report?firm=${firm}`);
    if (live.ok) {
      return (await live.json()) as ReportBundle;
    }
  } catch {
    // Backend not reachable; fall through to the static bundle.
  }

  const res = await fetch(`/data/report-${firm}.json`);
  if (!res.ok) {
    throw new Error(`Could not load report for ${firm} (${res.status})`);
  }
  return (await res.json()) as ReportBundle;
}

/** Loads the knowledge graph for the Graph tab. */
export async function loadGraph(): Promise<GraphView> {
  const res = await fetch(`${API_BASE}/api/graph`);
  if (!res.ok) {
    throw new Error(`Could not load the graph (${res.status})`);
  }
  return (await res.json()) as GraphView;
}

/** Loads the trace subgraph for one figure (the live result of the traversal it was computed along). */
export async function loadFigureGraph(figure: string): Promise<GraphView> {
  const res = await fetch(`${API_BASE}/api/figure-graph?figure=${encodeURIComponent(figure)}`);
  if (!res.ok) {
    throw new Error(`Could not load the trace graph for ${figure} (${res.status})`);
  }
  return (await res.json()) as GraphView;
}

/** Turns a figure code such as aggregate_non_ig_exposure into a readable label. */
export function readable(code: string): string {
  return code
    .split("_")
    .map((w) => (w === "ig" || w === "dv01" || w === "gre" ? w.toUpperCase() : w))
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}
