import { useEffect, useState } from "react";
import type { GraphView } from "../types";
import { loadFigureGraph } from "../api";
import { GraphPanel } from "./GraphPanel";

/**
 * Renders the trace subgraph for one figure: the live result of the traversal that figure was
 * computed along, fetched from the backend and drawn as a graph. This is the same path shown as text
 * in the detail panel, but as the actual nodes and edges from Neo4j.
 */
export function FigureTraceGraph({ figure }: { figure: string }) {
  const [graph, setGraph] = useState<GraphView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setGraph(null);
    setError(null);
    loadFigureGraph(figure)
      .then((g) => active && setGraph(g))
      .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [figure]);

  return (
    <div>
      {error && <div className="error-box">{error}</div>}
      {!error && !graph && <p className="hint">Loading trace...</p>}
      {graph && <GraphPanel graph={graph} height={340} showHint={false} />}
    </div>
  );
}
