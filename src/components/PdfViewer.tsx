export const PDF_URL = "/sample_fund_guidelines.pdf";

/** URL for the source PDF, optionally deep-linked to a page (the browser viewer reads #page=N). */
export const pdfHref = (page?: number | null) =>
  page != null ? `${PDF_URL}#page=${page}` : PDF_URL;

/**
 * The text to highlight in the PDF for a citation. We pass the whole passage summary; the viewer
 * normalizes it and matches the longest leading run it can find contiguously in the page text, so it
 * highlights as much of the row/sentence as lines up (and degrades to a shorter prefix if the tail
 * differs from the extracted text).
 */
export const chunkAnchor = (summary?: string | null): string => (summary ?? "").trim();

/** The source PDF rendered in the browser's native viewer, optionally opened to a given page. */
export function PdfViewer({ page }: { page?: number | null }) {
  return <iframe className="pdf-frame" src={pdfHref(page)} title="Sample fund guidelines" />;
}
