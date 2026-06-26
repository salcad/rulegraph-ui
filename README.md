# RuleGraph Report Viewer

A small React and TypeScript front end for reviewing a RuleGraph compliance run. It shows the computed
figures, lets a reviewer drill into any figure to see the graph path and source passage it traces to,
and presents the reconciliation, traceability, firewall, and audit results for the run.

## What it shows

- Figures. The thirteen report figures with value, status, limit, and utilisation. Selecting a figure
  opens a panel with its graph path and the exact source passage it cites.
- Graph. An interactive view of the knowledge graph the figures are computed over. Nodes are coloured
  by type, can be dragged to rearrange, and hovering one highlights what it connects to.
- Reconciliation. Each figure compared to the firm's answer key, with a pass or fail and a delta.
- Traceability. Confirmation that each figure resolves figure to graph path to a source chunk that
  exists in the graph.
- Firewall. The narrative commentary together with the check proving it introduced no number that is
  not in the computed output.
- Audit log. The append-only record of the run, event by event.

A Firm A / Firm B switch in the header reloads the view for the other firm. The three figures that
differ for Firm B (the non-investment-grade aggregate, the GRE concentration, and the basis-point
utilisation styling) are visible immediately.

## Where the data comes from

The viewer reads the report bundles the engine exports. The engine writes one JSON file per firm to
`artifacts/exports/report-<firm>.json`, and those files are served here from `public/data/`. This
keeps the engine as the single source of truth; the front end only presents what the engine produced.
Pointing the loader at a live backend endpoint instead would be a small change.

To refresh the data after a new run:

```bash
# from the engine project, after running the report for each firm
cp ../rulegraph-engine/artifacts/exports/report-firm_A.json public/data/
cp ../rulegraph-engine/artifacts/exports/report-firm_B.json public/data/
```

## Running

```bash
npm install
npm run dev
```

Then open the printed local URL (by default http://localhost:5173). To produce a production build:

```bash
npm run build
npm run preview
```

## Structure

```
src/
  App.tsx            tabs, firm switch, data loading
  api.ts             loads a firm's report bundle
  types.ts           the shape of the exported bundle
  components/
    Header.tsx       title, firm switch, summary chips
    FiguresTable.tsx figures list with the detail panel
    FigureDetail.tsx graph path and source for one figure
    ReconciliationView.tsx
    TraceabilityView.tsx
    FirewallView.tsx narrative and firewall result
    AuditView.tsx    the append-only audit trail
```
