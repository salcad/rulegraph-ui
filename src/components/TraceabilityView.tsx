import { useState } from "react";
import type { GraphView, TraceabilityReport } from "../types";
import { readable } from "../api";
import { PassFail } from "./StatusBadge";
import { GraphPanel, type FocusRequest } from "./GraphPanel";

interface TraceabilityViewProps {
  report: TraceabilityReport;
  graph: GraphView | null;
}

/** Confirms each figure resolves figure to graph path to a source chunk that exists in the graph. */
export function TraceabilityView({ report, graph }: TraceabilityViewProps) {
  const allPass = report.passed === report.total;
  const [focus, setFocus] = useState<FocusRequest | null>(null);

  // Locate a chunk's node in the (pinned) overview graph. No scrolling needed: the graph stays in
  // view on the left while the table scrolls on the right.
  const locateChunk = (chunkId: string) => {
    setFocus((prev) => ({ label: chunkId, nonce: (prev?.nonce ?? 0) + 1 }));
  };

  return (
    <>
      <div className={`banner ${allPass ? "ok" : "bad"}`}>
        {report.passed} of {report.total} figures resolve figure to graph path to source.
      </div>

      <div className="trace-layout">
        <section className="trace-graph-col">
          <h3 className="section-title">Graph overview</h3>
          <p className="hint section-sub">
            Click a source chunk in the table, or use the search box, to locate it here.
          </p>
          {graph ? (
            <GraphPanel graph={graph} focus={focus} height={480} showHint={false} />
          ) : (
            <p className="hint">Loading graph...</p>
          )}
        </section>

        <section className="trace-table-col">
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
                    <td className="mono">
                      {l.chunk_id == null ? (
                        "(none)"
                      ) : l.chunk_exists ? (
                        <button
                          type="button"
                          className="chunk-locate"
                          title="Find this chunk in the graph"
                          onClick={() => locateChunk(l.chunk_id!)}
                        >
                          {l.chunk_id}
                        </button>
                      ) : (
                        l.chunk_id
                      )}
                    </td>
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
        </section>
      </div>
    </>
  );
}
