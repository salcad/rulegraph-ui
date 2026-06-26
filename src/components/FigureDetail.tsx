import type { Figure, FigureInput } from "../types";
import { readable } from "../api";
import { StatusBadge } from "./StatusBadge";

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
    </div>
  );
}
