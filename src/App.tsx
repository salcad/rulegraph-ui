import { useEffect, useState } from "react";
import type { FirmId, GraphView, ReportBundle } from "./types";
import { loadFirms, loadGraph, loadReport } from "./api";
import { Header } from "./components/Header";
import { FiguresTable } from "./components/FiguresTable";
import { ReconciliationView } from "./components/ReconciliationView";
import { TraceabilityView } from "./components/TraceabilityView";
import { FirewallView } from "./components/FirewallView";
import { AuditView } from "./components/AuditView";
import { SourcePdfView } from "./components/SourcePdfView";
import { MethodStudio } from "./components/MethodStudio";

type Tab =
  | "figures"
  | "reconciliation"
  | "traceability"
  | "firewall"
  | "audit"
  | "source"
  | "method";

const TABS: { id: Tab; label: string }[] = [
  { id: "figures", label: "Figures" },
  { id: "reconciliation", label: "Reconciliation" },
  { id: "traceability", label: "Traceability" },
  { id: "firewall", label: "Firewall" },
  { id: "audit", label: "Audit log" },
  { id: "source", label: "Source PDF" },
  { id: "method", label: "Method DSL" },
];

export function App() {
  const [firm, setFirm] = useState<FirmId>("firm_A");
  const [firms, setFirms] = useState<FirmId[]>(["firm_A", "firm_B"]);
  const [tab, setTab] = useState<Tab>("figures");
  const [bundle, setBundle] = useState<ReportBundle | null>(null);
  const [graph, setGraph] = useState<GraphView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFirms().then(setFirms).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setError(null);
    loadReport(firm)
      .then((b) => active && setBundle(b))
      .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [firm]);

  // A method saved from the DSL tab: refresh the switcher and jump to the new firm's figures.
  const onFirmSaved = (savedFirm: FirmId, updatedFirms: FirmId[]) => {
    setFirms(updatedFirms);
    setFirm(savedFirm);
    setTab("figures");
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

  if (!bundle) {
    return (
      <div className="app">
        <p className="hint">Loading report...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Header firm={firm} firms={firms} onFirm={setFirm} bundle={bundle} />

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
      {tab === "method" && <MethodStudio onSaved={onFirmSaved} />}
    </div>
  );
}
