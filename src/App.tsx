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
  extractor: ExtractorMode,
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
  const [extractor, setExtractor] = useState<ExtractorMode>("seed");
  const [tab, setTab] = useState<Tab>("figures");
  const [bundle, setBundle] = useState<ReportBundle | null>(null);
  const [graph, setGraph] = useState<GraphView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // The LLM prompt/reply popup, shown after an LLM run loads so the operator sees exactly what was
  // asked and answered before reading the figures.
  const [llmExchange, setLlmExchange] = useState<LlmExchange | null>(null);

  useEffect(() => {
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

  // The LLM extractor calls a frontier model and can take a while; the seed extractor is instant.
  const loadingMessage =
    extractor === "llm"
      ? {
          title: "Running the LLM rule extractor",
          detail: "Asking the model to interpret the fund guidelines into rules. This can take up to a minute.",
        }
      : { title: "Loading report", detail: "Computing figures from the knowledge graph." };

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

  // First load (or a firm/extractor switch before any report exists): a centered spinner card.
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
      <Header
        firm={firm}
        onFirm={setFirm}
        extractor={extractor}
        onExtractor={setExtractor}
        bundle={bundle}
      />

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
