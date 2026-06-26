import type { GraphView, TraceabilityReport } from "../types";
import { readable } from "../api";
import { PassFail } from "./StatusBadge";
import { GraphPanel } from "./GraphPanel";

interface TraceabilityViewProps {
  report: TraceabilityReport;
  graph: GraphView | null;
}

/** Confirms each figure resolves figure to graph path to a source chunk that exists in the graph. */
export function TraceabilityView({ report, graph }: TraceabilityViewProps) {
  const allPass = report.passed === report.total;
  return (
    <>
      <div className={`banner ${allPass ? "ok" : "bad"}`}>
        {report.passed} of {report.total} figures resolve figure to graph path to source.
      </div>

      <section className="trace-overview">
        <h3 className="section-title">Graph overview</h3>
        <p className="hint section-sub">
          The full knowledge graph every figure below is traced over.
        </p>
        {graph ? <GraphPanel graph={graph} /> : <p className="hint">Loading graph...</p>}
      </section>
      <h3 className="section-title">Per-figure traceability</h3>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Figure</th>
              <th>Source chunk</th>
              <th>Has graph path</th>
              <th>Chunk exists in graph</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {report.lines.map((l) => (
              <tr key={l.figure}>
                <td>{readable(l.figure)}</td>
                <td className="mono">{l.chunk_id ?? "(none)"}</td>
                <td>{l.has_graph_path ? "yes" : "no"}</td>
                <td>{l.chunk_exists ? "yes" : "no"}</td>
                <td>
                  <PassFail pass={l.pass} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
