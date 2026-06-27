# RuleGraph Report Viewer

A small React and TypeScript front end for reviewing a RuleGraph compliance run. It runs the report
against the engine, lays out every computed figure, and lets a reviewer drill into any figure to see
the graph path it was computed along and the exact source passage it traces back to. Alongside the
figures it presents the reconciliation, traceability, firewall, and audit results, the source PDF
itself, a firm-method editor, and a glossary.

The viewer is intentionally a thin layer over the engine. It does no arithmetic of its own; it only
asks the engine to run, then shows what came back.

## Getting started

You need Node 18 or newer. Install the dependencies and start the dev server:

```bash
npm install
npm run dev
```

Then open the printed local URL (http://localhost:5173 by default). The viewer calls the engine's
web API directly from the browser, so for a live run the backend needs to be up on port 8074. Start
it from the engine project (`cd ../rulegraph-engine && docker compose up -d --build`); see that
project's README for the details. If the backend is unreachable the viewer falls back to the static
report bundles shipped under `public/data/`, so the UI still renders something to look at.

To produce a production build and preview it locally:

```bash
npm run build
npm run preview
```

## How a run works

The viewer opens on a deliberate landing screen rather than a precomputed report. Nothing is fetched
until you ask for it. You pick a firm (Firm A or Firm B) and press the run button, which kicks off
the engine's LLM rule extractor: a frontier model reads the guideline text and interprets it into
the structured rules the figures are computed from. This takes a few seconds, so a loading overlay
sits over the view while it works.

When the run lands, an LLM exchange popup shows the exact system and user prompt the model was sent
and the reply it returned, so you can see precisely what was asked and what came back. The figures
themselves are still computed by the engine, never by the model. If the run could not reach a live
model (no API key, an invalid key, an error, or an empty reply) the engine transparently falls back
to its deterministic seed rule set, and the popup says so instead of showing a prompt. If the backend
was unreachable entirely, the viewer serves the last exported static bundle and tells you that too.

A Firm A / Firm B switch in the header reloads the run for the other firm. The three figures that
differ for Firm B (the non-investment-grade aggregate, the GRE concentration, and the basis-point
utilisation styling) are visible immediately.

## What it shows

The report is organised into tabs:

- Figures. The thirteen report figures with value, status, limit, and utilisation. Selecting a figure
  opens a detail panel with its graph path, a small trace subgraph drawn live for that one figure, and
  a link straight to the source passage, highlighted in the PDF.
- Reconciliation. Each figure compared to the firm's answer key, with a pass or fail and a delta.
- Traceability. Confirmation that each figure resolves from figure to graph path to a source chunk
  that exists in the graph, alongside an interactive view of the whole knowledge graph. Nodes are
  coloured by type, can be dragged to rearrange, and hovering one highlights what it connects to; a
  search box focuses a node by name.
- Firewall. The narrative commentary together with the check proving it introduced no number that is
  not already in the computed output.
- Audit log. The append-only record of the run, event by event.
- Source PDF. The fund guidelines document rendered inline, so a reviewer can read the source next to
  the report and open or download it.
- Method DSL. A small studio for the per-firm method configuration. You edit a short line-oriented DSL
  describing a firm's three house conventions and the engine returns a live preview on each edit: the
  compiled config, a plain-English explanation, any per-line errors, and the figures those conventions
  would produce against the current graph.
- Glossary. A self-contained reference for the vocabulary the report uses: the formula variables, the
  figures and limits, the graph model, the firm-config switches, and the audit terms. It needs no
  backend data, so it always renders and doubles as onboarding for a new reviewer.

## Where the data comes from

For a live run the viewer talks to the engine's web API directly, cross-origin, and the backend
allows the viewer's origin via CORS. Each report tab is driven by one `/rulegraph-api/report` call;
the graph views call `/rulegraph-api/graph` and `/rulegraph-api/figure-graph`; the method studio
calls `/rulegraph-api/firm-method`. The engine is the single source of truth, and the front end only
presents what the engine produced.

If the backend cannot be reached, the loader falls back to the static report bundles the engine
exported, served from `public/data/report-<firm>.json`. To refresh those after a new run:

```bash
# from the engine project, after running the report for each firm
cp ../rulegraph-engine/artifacts/exports/report-firm_A.json public/data/
cp ../rulegraph-engine/artifacts/exports/report-firm_B.json public/data/
```

## Backend API URL

The API base URL is read from the `VITE_API_BASE_URL` environment variable at build time (Vite bakes
it into the bundle) and defaults to `http://localhost:8074` for local development. Set it for any
deployed build:

```bash
VITE_API_BASE_URL=https://api.example.com npm run build
```

The backend must allow this site's origin for CORS. Set `RULEGRAPH_CORS_ORIGINS` on the engine (see
the engine README). When the viewer is served over HTTPS the backend must be HTTPS too, otherwise the
browser blocks the call as mixed content.

## Tech

React 18 with TypeScript, built and served by Vite. The graph and trace views are drawn directly with
SVG rather than a charting library, and the source document is rendered with `pdfjs-dist`, including
the highlight boxes that locate a figure's cited passage on the page.

## Structure

```
src/
  App.tsx              landing screen, tabs, firm switch, run flow, data loading
  api.ts               loads a firm's report bundle and the graph views
  types.ts             the shape of the exported bundle
  components/
    Header.tsx              title, firm switch, extractor indicator, summary chips
    FiguresTable.tsx        figures list with the detail panel
    FigureDetail.tsx        graph path and source for one figure
    FigureTraceGraph.tsx    the live trace subgraph for a single figure
    GraphPanel.tsx          the interactive knowledge-graph view with search
    ReconciliationView.tsx
    TraceabilityView.tsx
    FirewallView.tsx        narrative and firewall result
    AuditView.tsx           the append-only audit trail
    SourcePdfView.tsx       the guidelines PDF rendered inline
    PdfViewer.tsx           full-document PDF rendering
    PdfHighlightViewer.tsx  one page with a cited passage highlighted
    MethodStudio.tsx        the firm-method DSL editor with live preview
    Glossary.tsx            the vocabulary reference
    LlmExchangeModal.tsx    the prompt-and-reply popup shown after an LLM run
    StatusBadge.tsx         the ok / at-limit / breach status pill
    Modal.tsx               a small reusable dialog
```
