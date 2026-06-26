import { useEffect, useRef, useState } from "react";
import type { FirmId, FirmMethodPreview } from "../types";
import { loadFirmMethodDsl, previewFirmMethod, readable, saveFirmMethod } from "../api";
import { StatusBadge } from "./StatusBadge";

interface Props {
  /** Called after a method is saved as a firm, with the saved id and the refreshed firm list. */
  onSaved?: (firm: FirmId, firms: FirmId[]) => void;
}

const STARTER = [
  "# Express a firm's method, one directive per line.",
  "firm acme_capital",
  "fallen_angels include    # include | exclude",
  "gre by parent            # by issuer | by parent",
  "utilization bps          # percent | bps",
  "",
].join("\n");

/**
 * The "Method DSL" tab: a small editor for the firm-method mini-DSL with a live preview. As the
 * analyst types, the draft is compiled by the backend into a firm config — showing per-line errors,
 * a plain-English reading of the conventions, and the figures those conventions would produce
 * against the current graph. Compiling is pure configuration; no calculator code changes.
 */
export function MethodStudio({ onSaved }: Props) {
  const [dsl, setDsl] = useState<string>(STARTER);
  const [preview, setPreview] = useState<FirmMethodPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const debounce = useRef<number | undefined>(undefined);

  // Debounced live compile: re-preview ~350ms after the last keystroke.
  useEffect(() => {
    window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => {
      setBusy(true);
      setError(null);
      previewFirmMethod(dsl)
        .then(setPreview)
        .catch((e) => setError(String(e)))
        .finally(() => setBusy(false));
    }, 350);
    return () => window.clearTimeout(debounce.current);
  }, [dsl]);

  const loadTemplate = (firm: FirmId) => {
    setSaved(null);
    loadFirmMethodDsl(firm)
      .then(setDsl)
      .catch((e) => setError(String(e)));
  };

  const save = () => {
    setSaving(true);
    setError(null);
    setSaved(null);
    saveFirmMethod(dsl)
      .then((res) => {
        setSaved(res.firm_id);
        onSaved?.(res.firm_id, res.firms);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setSaving(false));
  };

  const canSave = !!preview?.valid && !busy && !saving;

  return (
    <div className="studio">
      <div className="studio-bar">
        <span className="studio-hint">Load a template:</span>
        <button onClick={() => loadTemplate("firm_A")}>Firm A</button>
        <button onClick={() => loadTemplate("firm_B")}>Firm B</button>
        <button className="primary" disabled={!canSave} onClick={save}>
          {saving ? "Saving…" : "Save as firm"}
        </button>
        <span className={`studio-status ${busy ? "busy" : ""}`}>
          {saved ? `saved ${saved}` : busy ? "compiling…" : preview?.valid ? "compiled" : "—"}
        </span>
      </div>

      <div className="studio-grid">
        <textarea
          className="dsl-editor mono"
          spellCheck={false}
          value={dsl}
          onChange={(e) => setDsl(e.target.value)}
        />

        <div className="studio-preview">
          {error && <div className="error-box">{error}</div>}

          {preview && (
            <>
              {preview.errors.length > 0 && (
                <div className="method-card errors">
                  <h3>Errors</h3>
                  <ul>
                    {preview.errors.map((e, i) => (
                      <li key={i}>
                        <span className="mono">line {e.line}</span>: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="method-card">
                <h3>Compiled method</h3>
                <dl className="method-config">
                  <dt>Firm id</dt>
                  <dd className="mono">{preview.config.firm_id}</dd>
                  <dt>Fallen angels</dt>
                  <dd>{preview.config.include_fallen_angels ? "include" : "exclude"}</dd>
                  <dt>GRE group by</dt>
                  <dd>{preview.config.gre_group_by}</dd>
                  <dt>Utilization</dt>
                  <dd>{preview.config.utilization_format}</dd>
                </dl>
                <ul className="method-explain">
                  {preview.explanation.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>

              <div className="method-card">
                <h3>Figures effect</h3>
                {preview.figures ? (
                  <table className="method-figures">
                    <thead>
                      <tr>
                        <th>Figure</th>
                        <th>Value</th>
                        <th>Utilization</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.figures.map((f) => (
                        <tr key={f.figure}>
                          <td>{readable(f.figure)}</td>
                          <td className="mono">{f.value ?? "—"}</td>
                          <td className="mono">{f.utilization ?? "—"}</td>
                          <td>
                            <StatusBadge status={f.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="hint">{preview.figures_note ?? "No figures to show."}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
