import { useState } from "react";
import type { Figure, FigureInput } from "../types";
import { readable, sourceFileUrl } from "../api";
import { StatusBadge } from "./StatusBadge";
import { Modal } from "./Modal";
import { SourceFileView } from "./SourceFileView";

// The Formula box links to the raw source files the engine streams, so a figure's number can be
// traced to the holdings it sums and the arithmetic that combined them, without leaving the report.
type SourceModal = "holdings" | "formulas" | null;

interface FigureDetailProps {
  figure: Figure | null;
  onShowGraph: () => void;
  onShowPdf: () => void;
}

/** Format an input value the way the figures read: grouped thousands, trimmed decimals. */
function formatInput(value: number): string {
  return value.toLocaleString("en-SG", { maximumFractionDigits: 4 });
}

/** Rewrite the formula with each variable replaced by this run's value, so the maths is concrete. */
function substitute(formula: string, inputs: FigureInput[]): string {
  let out = formula;
  for (const input of inputs) {
    out = out.replace(new RegExp(`\\b${input.name}\\b`, "g"), formatInput(input.value));
  }
  return out;
}

/** Drill-down for one figure: its value, then the graph path and source it traces to. */
export function FigureDetail({ figure, onShowGraph, onShowPdf }: FigureDetailProps) {
  // Which raw source file (if any) is open in the popup. Reset whenever the selected figure changes.
  const [sourceModal, setSourceModal] = useState<SourceModal>(null);

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

        <dt>Formula</dt>
        <dd>
          {figure.formula ? (
            <div className="formula">
              <code className="mono">{figure.formula}</code>
              {figure.inputs && figure.inputs.length > 0 && (
                <>
                  <div className="subst mono">
                    = {substitute(figure.formula, figure.inputs)}
                    {figure.value ? ` = ${figure.value}` : ""}
                  </div>
                  <ul className="inputs">
                    {figure.inputs.map((input) => (
                      <li key={input.name}>
                        <code className="mono">{input.name}</code> ={" "}
                        <strong>{formatInput(input.value)}</strong>
                        <span className="src">: {input.description}</span>
                        {input.query && (
                          <pre className="query mono">{input.query}</pre>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="src">
                Evaluated by the formula-registry DSL (config, not the language model). The graph
                traversal selects the inputs above; this expression computes the value.
              </div>
              <div className="source-links">
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setSourceModal("holdings")}
                >
                  View holdings data (sample_holdings.csv)
                </button>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setSourceModal("formulas")}
                >
                  View formula registry (formulas.yaml)
                </button>
              </div>
            </div>
          ) : (
            "(none)"
          )}
        </dd>

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

      {sourceModal === "holdings" && (
        <Modal title="Holdings data: sample_holdings.csv" onClose={() => setSourceModal(null)}>
          <SourceFileView url={sourceFileUrl("holdings")} kind="csv" highlight={readable(figure.figure)} />
        </Modal>
      )}
      {sourceModal === "formulas" && (
        <Modal title="Formula registry: formulas.yaml" onClose={() => setSourceModal(null)}>
          <SourceFileView url={sourceFileUrl("formulas")} kind="yaml" highlight={figure.formula} />
        </Modal>
      )}
    </div>
  );
}
