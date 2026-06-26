import type { FirmId, ReportBundle } from "../types";

interface Props {
  firm: FirmId;
  onFirm: (f: FirmId) => void;
  bundle: ReportBundle;
}

/** Title, the Firm A / Firm B switch, and the run summary chips. */
export function Header({ firm, onFirm, bundle }: Props) {
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
          <button className={firm === "firm_A" ? "active" : ""} onClick={() => onFirm("firm_A")}>
            Firm A
          </button>
          <button className={firm === "firm_B" ? "active" : ""} onClick={() => onFirm("firm_B")}>
            Firm B
          </button>
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
