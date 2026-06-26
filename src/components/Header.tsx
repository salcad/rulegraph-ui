import type { FirmId, ReportBundle } from "../types";
import { readable } from "../api";

interface Props {
  firm: FirmId;
  firms: FirmId[];
  onFirm: (f: FirmId) => void;
  bundle: ReportBundle;
}

/** Title, the firm switch (bundled + saved firms), and the run summary chips. */
export function Header({ firm, firms, onFirm, bundle }: Props) {
  const rec = bundle.reconciliation;
  const trace = bundle.traceability;
  const fw = bundle.firewall.check;
  return (
    <header className="header">
      <h1>RuleGraph Report Viewer</h1>
      <div className="sub">
        Audit-grade portfolio compliance figures, traced through the knowledge graph.
      </div>

      <div className="header-row">
        <div className="firm-toggle" role="tablist" aria-label="Select firm">
          {firms.map((f) => (
            <button key={f} className={firm === f ? "active" : ""} onClick={() => onFirm(f)}>
              {readable(f)}
            </button>
          ))}
        </div>

        <div className="summary">
          <span className={`chip ${rec.passed === rec.total ? "good" : "bad"}`}>
            Reconciliation <b>{rec.passed}/{rec.total}</b>
          </span>
          <span className={`chip ${trace.passed === trace.total ? "good" : "bad"}`}>
            Traceable <b>{trace.passed}/{trace.total}</b>
          </span>
          <span className={`chip ${fw.pass ? "good" : "bad"}`}>
            Firewall <b>{fw.pass ? "pass" : "fail"}</b>
          </span>
          <span className="chip">
            Figures <b>{bundle.figures.length}</b>
          </span>
        </div>
      </div>
    </header>
  );
}
