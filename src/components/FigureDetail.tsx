import type { Figure } from "../types";
import { readable } from "../api";
import { StatusBadge } from "./StatusBadge";

interface FigureDetailProps {
  figure: Figure | null;
  onShowGraph: () => void;
  onShowPdf: () => void;
}

/** Drill-down for one figure: its value, then the graph path and source it traces to. */
export function FigureDetail({ figure, onShowGraph, onShowPdf }: FigureDetailProps) {
  if (!figure) {
    return (
      <div className="detail">
        <p className="hint">Select a figure to see how it was computed and where it came from.</p>
      </div>
    );
  }

  return (
    <div className="detail">
      <h3>{readable(figure.figure)}</h3>
      <StatusBadge status={figure.status} />
      <div className="figval">{figure.value ?? "n/a"}</div>

      <dl>
        <dt>Limit</dt>
        <dd>{figure.limit ?? "n/a"}</dd>

        <dt>Utilisation</dt>
        <dd>{figure.utilization ?? "n/a"}</dd>

        <dt>Graph path</dt>
        <dd className="path mono">
          {figure.graph_path ?? "(none)"}
          <button type="button" className="link-btn" onClick={onShowGraph}>
            View trace graph
          </button>
        </dd>

        <dt>Source</dt>
        <dd>
          {figure.citation ? (
            <div className="cite">
              <div>{figure.citation.passage_summary}</div>
              <div className="src">
                {figure.citation.source_doc}
                {figure.citation.page != null ? `, page ${figure.citation.page}` : ""} ·{" "}
                {figure.citation.chunk_id}
              </div>
              <button type="button" className="link-btn" onClick={onShowPdf}>
                View PDF
              </button>
            </div>
          ) : (
            "(none)"
          )}
        </dd>
      </dl>
    </div>
  );
}
