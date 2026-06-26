import { PDF_URL, PdfViewer } from "./PdfViewer";

/** Renders the source fund guidelines PDF inline so reviewers can read it next to the report. */
export function SourcePdfView() {
  return (
    <>
      <div className="banner ok">
        Source document the figures and rules were extracted from.{" "}
        <a href={PDF_URL} target="_blank" rel="noopener noreferrer">
          Open in a new tab
        </a>{" "}
        or{" "}
        <a href={PDF_URL} download>
          download
        </a>
        .
      </div>
      <div className="panel pdf-panel">
        <PdfViewer />
      </div>
    </>
  );
}
