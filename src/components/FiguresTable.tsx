import { lazy, Suspense, useState } from "react";
import type { Figure } from "../types";
import { readable } from "../api";
import { StatusBadge } from "./StatusBadge";
import { FigureDetail } from "./FigureDetail";
import { FigureTraceGraph } from "./FigureTraceGraph";
import { Modal } from "./Modal";
import { chunkAnchor } from "./PdfViewer";

// pdf.js is heavy; only pull it in when the source PDF popup is actually opened.
const PdfHighlightViewer = lazy(() =>
  import("./PdfHighlightViewer").then((m) => ({ default: m.PdfHighlightViewer }))
);

/** The figures list on the left; clicking a row shows its traceability detail on the right. */
export function FiguresTable({ figures }: { figures: Figure[] }) {
  const [selected, setSelected] = useState<Figure | null>(figures[0] ?? null);
  // The figure whose trace graph is shown in the popup, or null when the popup is closed.
  const [graphFor, setGraphFor] = useState<Figure | null>(null);
  // The figure whose source PDF is shown in the popup, or null when the popup is closed.
  const [pdfFor, setPdfFor] = useState<Figure | null>(null);

  const table = (
    <div className="split">
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Figure</th>
              <th className="num">Value</th>
              <th>Status</th>
              <th>Limit</th>
              <th className="num">Utilisation</th>
            </tr>
          </thead>
          <tbody>
            {figures.map((f) => (
              <tr
                key={f.figure}
                className={`clickable ${selected?.figure === f.figure ? "selected" : ""}`}
                onClick={() => setSelected(f)}
              >
                <td>{readable(f.figure)}</td>
                <td className="num">{f.value ?? "n/a"}</td>
                <td>
                  <StatusBadge status={f.status} />
                </td>
                <td>{f.limit ?? "n/a"}</td>
                <td className="num">{f.utilization ?? "n/a"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FigureDetail
        figure={selected}
        onShowGraph={() => setGraphFor(selected)}
        onShowPdf={() => setPdfFor(selected)}
      />
    </div>
  );

  return (
    <>
      {table}
      {graphFor && (
        <Modal title={`Trace graph — ${readable(graphFor.figure)}`} onClose={() => setGraphFor(null)}>
          <FigureTraceGraph figure={graphFor.figure} />
        </Modal>
      )}
      {pdfFor && (
        <Modal
          title={`Source — ${readable(pdfFor.figure)}`}
          onClose={() => setPdfFor(null)}
        >
          <Suspense fallback={<p className="hint">Loading viewer...</p>}>
            <PdfHighlightViewer
              page={pdfFor.citation?.page}
              highlight={chunkAnchor(pdfFor.citation?.passage_summary)}
            />
          </Suspense>
        </Modal>
      )}
    </>
  );
}

