import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFPageProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDF_URL, pdfHref } from "./PdfViewer";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface PdfHighlightViewerProps {
  /** 1-based page to render; defaults to page 1. */
  page?: number | null;
  /** Text to locate and highlight on the page. */
  highlight?: string | null;
}

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Normalize for matching: decode the few HTML entities that appear in summaries, drop punctuation
// (parens, slashes, ampersands, etc.) to spaces, and collapse whitespace. Applied to both the anchor
// and the PDF text so e.g. "Structured Credit (ABS/MBS)" matches regardless of punctuation.
const norm = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Renders one page of the source PDF with PDF.js and draws highlight boxes over the text items that
 * make up the cited chunk, then scrolls the first match into view. This works in every browser,
 * unlike the native viewer's #search fragment.
 */
export function PdfHighlightViewer({ page, highlight }: PdfHighlightViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<PDFPageProxy["render"]> | null = null;
    setLoading(true);
    setError(null);
    setBoxes([]);

    (async () => {
      try {
        const doc = await pdfjs.getDocument({ url: PDF_URL }).promise;
        if (cancelled) return;
        const pageNum = Math.min(Math.max(page ?? 1, 1), doc.numPages);
        const pdfPage: PDFPageProxy = await doc.getPage(pageNum);
        if (cancelled) return;

        // Fit the page to the container width (with a sensible fallback before layout).
        const containerWidth = scrollRef.current?.clientWidth ?? 880;
        const unscaled = pdfPage.getViewport({ scale: 1 });
        const scale = Math.min(containerWidth / unscaled.width, 2);
        const viewport = pdfPage.getViewport({ scale });

        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setSize({ w: viewport.width, h: viewport.height });

        renderTask = pdfPage.render({ canvas, canvasContext: ctx, viewport });
        await renderTask.promise;
        if (cancelled) return;

        // Locate the chunk as a contiguous phrase across the page's text items, then highlight every
        // item that overlaps it. Phrase matching (rather than per-word) avoids lighting up common
        // words scattered around the page for the longer rule sentences.
        const anchor = norm(highlight ?? "");
        const found: Box[] = [];
        if (anchor) {
          const content = await pdfPage.getTextContent();
          if (cancelled) return;

          // Build a normalized string of the whole page, remembering each item's char span in it.
          let combined = "";
          const spans: { start: number; end: number; item: (typeof content.items)[number] }[] = [];
          for (const item of content.items) {
            if (!("str" in item)) continue;
            const piece = norm(item.str);
            if (!piece) continue;
            const start = combined.length;
            combined += piece;
            spans.push({ start, end: combined.length, item });
            combined += " ";
          }

          // Try the full anchor, then progressively shorter prefixes (long passages can differ
          // mid-sentence from the extracted text; the leading words still pin the location).
          let words = anchor.split(" ");
          let at = -1;
          let phrase = "";
          while (at < 0 && words.length >= 2) {
            phrase = words.join(" ");
            at = combined.indexOf(phrase);
            if (at < 0) words = words.slice(0, -1);
          }

          if (at >= 0) {
            const end = at + phrase.length;
            for (const s of spans) {
              if (s.start < end && s.end > at) {
                const item = s.item;
                if (!("transform" in item)) continue;
                const tx = pdfjs.Util.transform(viewport.transform, item.transform);
                const fontHeight = Math.hypot(tx[2], tx[3]);
                found.push({
                  left: tx[4],
                  top: tx[5] - fontHeight,
                  width: item.width * scale,
                  height: fontHeight,
                });
              }
            }
          }
        }
        setBoxes(found);
        setLoading(false);

        // Scroll the first highlight into view.
        if (found.length && scrollRef.current) {
          const top = Math.min(...found.map((b) => b.top));
          scrollRef.current.scrollTop = Math.max(0, top - 80);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [page, highlight]);

  if (error) {
    return (
      <div className="error-box">
        Could not render the PDF ({error}).{" "}
        <a href={pdfHref(page)} target="_blank" rel="noopener noreferrer">
          Open it directly
        </a>
        .
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="pdf-hl-scroll">
      {loading && <p className="hint">Rendering page...</p>}
      <div className="pdf-hl-page" style={{ width: size.w, height: size.h }}>
        <canvas ref={canvasRef} className="pdf-hl-canvas" />
        {boxes.map((b, i) => (
          <div
            key={i}
            className="pdf-hl-box"
            style={{ left: b.left, top: b.top, width: b.width, height: b.height }}
          />
        ))}
      </div>
    </div>
  );
}
