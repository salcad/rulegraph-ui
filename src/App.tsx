import { useEffect, useState } from "react";
import type { ExtractorMode, FirmId, GraphView, LlmExchange, ReportBundle } from "./types";
import { loadGraph, loadReport } from "./api";
import { Header } from "./components/Header";
import { LlmExchangeModal } from "./components/LlmExchangeModal";
import { FiguresTable } from "./components/FiguresTable";
import { ReconciliationView } from "./components/ReconciliationView";
import { TraceabilityView } from "./components/TraceabilityView";
import { FirewallView } from "./components/FirewallView";
import { AuditView } from "./components/AuditView";
import { SourcePdfView } from "./components/SourcePdfView";
import { MethodStudio } from "./components/MethodStudio";
import { Glossary } from "./components/Glossary";

type Tab =
  | "figures"
  | "reconciliation"
  | "traceability"
  | "firewall"
  | "audit"
  | "source"
  | "method"
  | "glossary";

// Display-only hint for the run button on the landing screen, where no report (and so no llm_model)
// has loaded yet. It mirrors the backend's configured OPENROUTER_MODEL; the header shows the
// authoritative model name from the bundle once a run completes.
const LLM_MODEL_HINT = "Sonnet 4.6";

const TABS: { id: Tab; label: string }[] = [
  { id: "figures", label: "Figures" },
  { id: "reconciliation", label: "Reconciliation" },
  { id: "traceability", label: "Traceability" },
  { id: "firewall", label: "Firewall" },
  { id: "audit", label: "Audit log" },
  { id: "source", label: "Source PDF" },
  { id: "method", label: "Method DSL" },
  { id: "glossary", label: "Glossary" },
];

/**
 * Decides what (if anything) to show in the LLM prompt/reply popup after a report loads. For a live
 * LLM run it returns the engine's recorded exchange. When an LLM run lands on the static-bundle
 * fallback the engine was unreachable, so the LLM never ran — return a warning-only exchange so the
 * operator is told the figures are the previously exported bundle, not a fresh LLM run.
 */
function llmPopupFor(
  extractor: ExtractorMode | null,
  source: "live" | "static",
  bundle: ReportBundle,
): LlmExchange | null {
  if (extractor !== "llm") return null;
  if (source === "static") {
    return {
      model: "n/a",
      system_prompt: "",
      user_prompt: "",
      reply: "",
      fell_back: true,
      note:
        "The engine was unreachable, so the LLM extractor did not run. These figures are the " +
        "last static bundle the engine exported, not a fresh LLM run. Start the backend and try " +
        "again to run the LLM.",
    };
  }
  return bundle.llm_exchange ?? null;
}

export function App() {
  const [firm, setFirm] = useState<FirmId>("firm_A");
  // No extractor is chosen on first load: nothing runs until the operator explicitly asks for the LLM
  // rule extractor, so the demo opens on a deliberate "run it" landing rather than a precomputed report.
  const [extractor, setExtractor] = useState<ExtractorMode | null>(null);
  const [tab, setTab] = useState<Tab>("figures");
  const [bundle, setBundle] = useState<ReportBundle | null>(null);
  const [graph, setGraph] = useState<GraphView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // The LLM prompt/reply popup, shown after an LLM run loads so the operator sees exactly what was
  // asked and answered before reading the figures.
  const [llmExchange, setLlmExchange] = useState<LlmExchange | null>(null);

  useEffect(() => {
    // Until the operator picks an extractor, sit on the landing screen and fetch nothing.
    if (!extractor) {
      setLoading(false);
      return;
    }
    let active = true;
    setError(null);
    setLoading(true);
    // Keep the previous report on screen while the next one loads so the page never blanks out — the
    // LLM run in particular can take many seconds, and an overlay is shown over the stale view.
    loadReport(firm, extractor)
      .then(({ bundle: b, source }) => {
        if (!active) return;
        setBundle(b);
        setLlmExchange(llmPopupFor(extractor, source, b));
      })
      .catch((e) => active && setError(String(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [firm, extractor]);

  // The only extractor the viewer runs is the LLM one, which calls a frontier model and can take a while.
  const loadingMessage = {
    title: "Running the LLM rule extractor",
    detail: "Asking the model to interpret the fund guidelines into rules. This can take up to a minute.",
  };

  // Load the graph the first time the Traceability tab (which holds the overview graph) is opened.
  useEffect(() => {
    if (tab === "traceability" && !graph) {
      loadGraph()
        .then(setGraph)
        .catch((e) => setError(String(e)));
    }
  }, [tab, graph]);

  if (error) {
    return (
      <div className="app">
        <div className="error-box">
          {error}. Generate the bundles with the engine
          (<span className="mono">java -jar rulegraph-engine.jar report --firm=firm_A</span>) and
          copy them into <span className="mono">public/data/</span>.
        </div>
      </div>
    );
  }

  // Landing screen: nothing has been run yet. The operator picks a firm and starts the LLM rule
  // extractor — no report is fetched or shown until they do.
  if (!extractor && !bundle) {
    return (
      <div className="app">
        <div className="loading-card start-card">
          <div className="loading-text">
            <strong>RuleGraph Report Viewer</strong>
            <span>
              Pick a firm and run the LLM rule extractor. The model reads the fund guidelines and
              interprets them into rules; the engine then computes every figure from the knowledge
              graph. This can take up to a minute.
            </span>
          </div>
          <div className="firm-toggle" role="tablist" aria-label="Select firm">
            <button className={firm === "firm_A" ? "active" : ""} onClick={() => setFirm("firm_A")}>
              Firm A
            </button>
            <button className={firm === "firm_B" ? "active" : ""} onClick={() => setFirm("firm_B")}>
              Firm B
            </button>
          </div>
          <button className="run-extractor" onClick={() => setExtractor("llm")}>
            Run rule extractor via LLM ({LLM_MODEL_HINT})
          </button>
        </div>
      </div>
    );
  }

  // First run in progress before any report exists: a centered spinner card.
  if (!bundle) {
    return (
      <div className="app">
        <div className="loading-card" role="status" aria-live="polite">
          <div className="spinner" aria-hidden="true" />
          <div className="loading-text">
            <strong>{loadingMessage.title}…</strong>
            <span>{loadingMessage.detail}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header firm={firm} onFirm={setFirm} bundle={bundle} />

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "figures" && <FiguresTable figures={bundle.figures} />}
      {tab === "reconciliation" && <ReconciliationView report={bundle.reconciliation} />}
      {tab === "traceability" && <TraceabilityView report={bundle.traceability} graph={graph} />}
      {tab === "firewall" && <FirewallView firewall={bundle.firewall} />}
      {tab === "audit" && <AuditView events={bundle.audit} />}
      {tab === "source" && <SourcePdfView />}
      {tab === "method" && <MethodStudio />}
      {tab === "glossary" && <Glossary />}

      {loading && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-card">
            <div className="spinner" aria-hidden="true" />
            <div className="loading-text">
              <strong>{loadingMessage.title}…</strong>
              <span>{loadingMessage.detail}</span>
            </div>
          </div>
        </div>
      )}

      {llmExchange && (
        <LlmExchangeModal exchange={llmExchange} onClose={() => setLlmExchange(null)} />
      )}
    </div>
  );
}
