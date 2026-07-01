import type { ExtractorMode, FirmId, FirmMethodPreview, GraphView, ReportBundle } from "./types";

// Base URL for the engine's web API. The front end calls /rulegraph-api/* as SAME-ORIGIN relative
// paths; an nginx in front routes /rulegraph-api/ to the engine (see nginx.conf / README), so there
// is no CORS and no build-time URL baking. Defaults to "" (same origin). VITE_API_BASE_URL can still
// be set to call a different origin directly (e.g. local dev against a remote backend), in which case
// the backend must allow that origin via CORS (RULEGRAPH_CORS_ORIGINS / WebConfig).
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

/**
 * The result of loading a report: the bundle plus its source. {@code source} is {@code "live"} when
 * the engine ran the pipeline for this request, or {@code "static"} when the backend was unreachable
 * and we fell back to the bundle the engine previously exported. The caller uses this to warn that a
 * requested LLM run did not actually execute.
 */
export interface ReportResult {
  bundle: ReportBundle;
  source: "live" | "static";
}

/**
 * Loads a firm's report bundle. It first asks the engine's web API to run the pipeline live; if the
 * backend is not reachable it falls back to the static bundle the engine exported (served from
 * public/data/). Either way the engine is the source of the figures.
 *
 * The {@code extractor} selects the rule extractor for the live run (hardcoded seed vs LLM). The
 * static-bundle fallback was exported with whatever extractor the engine ran at export time and
 * cannot honour this choice — so a request for an LLM run that lands on the fallback did not run the
 * LLM at all, which the {@code source} field lets the caller flag.
 */
export async function loadReport(firm: FirmId, extractor?: ExtractorMode): Promise<ReportResult> {
  try {
    const params = new URLSearchParams({ firm });
    if (extractor) {
      params.set("extractor", extractor);
    }
    const live = await fetch(`${API_BASE}/rulegraph-api/report?${params.toString()}`);
    if (live.ok) {
      return { bundle: (await live.json()) as ReportBundle, source: "live" };
    }
  } catch {
    // Backend not reachable; fall through to the static bundle.
  }

  const res = await fetch(`/data/report-${firm}.json`);
  if (!res.ok) {
    throw new Error(`Could not load report for ${firm} (${res.status})`);
  }
  return { bundle: (await res.json()) as ReportBundle, source: "static" };
}

/** Loads the knowledge graph for the Graph tab. */
export async function loadGraph(): Promise<GraphView> {
  const res = await fetch(`${API_BASE}/rulegraph-api/graph`);
  if (!res.ok) {
    throw new Error(`Could not load the graph (${res.status})`);
  }
  return (await res.json()) as GraphView;
}

/** Loads the trace subgraph for one figure (the live result of the traversal it was computed along). */
export async function loadFigureGraph(figure: string): Promise<GraphView> {
  const res = await fetch(`${API_BASE}/rulegraph-api/figure-graph?figure=${encodeURIComponent(figure)}`);
  if (!res.ok) {
    throw new Error(`Could not load the trace graph for ${figure} (${res.status})`);
  }
  return (await res.json()) as GraphView;
}

/**
 * Compiles a firm-method DSL draft and returns the live preview: the resolved config, validation
 * errors, a plain-English explanation, and (best-effort) the figures those conventions produce.
 * Requires the live backend. The static-bundle fallback cannot recompute figures.
 */
export async function previewFirmMethod(dsl: string): Promise<FirmMethodPreview> {
  const res = await fetch(`${API_BASE}/rulegraph-api/firm-method/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dsl, run: true }),
  });
  if (!res.ok) {
    throw new Error(`Preview failed (${res.status})`);
  }
  return (await res.json()) as FirmMethodPreview;
}

/** Loads the canonical DSL for a known firm, to seed the editor from a real template. */
export async function loadFirmMethodDsl(firm: FirmId): Promise<string> {
  const res = await fetch(`${API_BASE}/rulegraph-api/firm-method/dsl?firm=${firm}`);
  if (!res.ok) {
    throw new Error(`Could not load the DSL template for ${firm} (${res.status})`);
  }
  return ((await res.json()) as { dsl: string }).dsl;
}

/**
 * URL for a raw source file streamed by the engine ({@code holdings} = sample_holdings.csv,
 * {@code formulas} = formulas.yaml). The viewer shows these unmodified next to a figure; streaming
 * them from the engine means there is no second copy to drift from the files the pipeline reads.
 */
export function sourceFileUrl(name: "holdings" | "formulas"): string {
  return `${API_BASE}/rulegraph-api/source/${name}`;
}

/** Loads the current holdings CSV text (the exact file the pipeline ingests), for the demo editor. */
export async function loadHoldingsCsv(): Promise<string> {
  const res = await fetch(sourceFileUrl("holdings"));
  if (!res.ok) {
    throw new Error(`Could not load the holdings CSV (${res.status})`);
  }
  return res.text();
}

/**
 * Overwrites the holdings CSV with an edited version. The engine validates it parses the way the
 * pipeline expects and returns a 400 with a readable reason otherwise, which we surface to the editor.
 */
export async function saveHoldingsCsv(csv: string): Promise<void> {
  const res = await fetch(`${API_BASE}/rulegraph-api/source/holdings`, {
    method: "PUT",
    headers: { "Content-Type": "text/csv" },
    body: csv,
  });
  if (!res.ok) {
    const reason = (await res.text()) || `${res.status}`;
    throw new Error(reason);
  }
}

/** Restores the holdings CSV to the snapshot the engine took before the first edit. */
export async function restoreHoldingsCsv(): Promise<void> {
  const res = await fetch(`${API_BASE}/rulegraph-api/source/holdings/restore`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Could not restore the holdings CSV (${res.status})`);
  }
}

/** Turns a figure code such as aggregate_non_ig_exposure into a readable label. */
export function readable(code: string): string {
  return code
    .split("_")
    .map((w) => (w === "ig" || w === "dv01" || w === "gre" ? w.toUpperCase() : w))
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}
