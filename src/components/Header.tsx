import type { FirmId, ReportBundle } from "../types";

interface Props {
  firm: FirmId;
  onFirm: (f: FirmId) => void;
  bundle: ReportBundle;
}

/**
 * Turns an OpenRouter model id into a short, viewer-friendly label by dropping the provider prefix
 * and the vendor brand, e.g. "anthropic/claude-sonnet-4.6" -> "Sonnet-4.6". Returns null for the
 * "n/a" placeholder used when the LLM never actually ran.
 */
function prettyModel(model: string | undefined): string | null {
  if (!model || model === "n/a") return null;
  const afterProvider = model.includes("/") ? model.slice(model.lastIndexOf("/") + 1) : model;
  const withoutBrand = afterProvider.replace(/^claude-/i, "");
  return withoutBrand.charAt(0).toUpperCase() + withoutBrand.slice(1);
}

/** Title, the Firm A / Firm B switch, the rule-extractor indicator, and the run summary chips. */
export function Header({ firm, onFirm, bundle }: Props) {
  const rec = bundle.reconciliation;
  const trace = bundle.traceability;
  const fw = bundle.firewall.check;
  // The model that produced this run's rules. The viewer only runs the LLM extractor, so this is
  // shown as a static indicator rather than a toggle.
  const model = prettyModel(bundle.llm_model);
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

        <div className="firm-toggle extractor-toggle" aria-label="Rule extractor">
          <span className="toggle-label">Rule extractor</span>
          <span
            className="extractor-value"
            title="The LLM interpreted the guideline text into rules for this run"
          >
            {model ? `LLM (${model})` : "LLM"}
          </span>
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
