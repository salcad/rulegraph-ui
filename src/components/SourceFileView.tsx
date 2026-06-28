import { useEffect, useState } from "react";

interface SourceFileViewProps {
  /** Static URL of the raw file (served from public/, same as the source PDF). */
  url: string;
  /** How to render it: a CSV gets a table, a YAML gets highlighted monospace text. */
  kind: "csv" | "yaml";
  /**
   * Optional text to draw attention to. For a CSV it matches the asset-class column so the rows that
   * feed the selected figure stand out; for a YAML it matches whole lines (e.g. the active formula).
   */
  highlight?: string | null;
}

/** Normalise for a forgiving, case-insensitive comparison (readable labels vs. raw CSV casing). */
function norm(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Shows a raw source file inline, exactly as it ships with the engine, so a reviewer can read the
 * data and the arithmetic a figure was built from without leaving the report. This is the raw file,
 * not a derived view: the CSV is every holding, the YAML is the whole formula registry (comments and
 * all). The optional highlight only draws the eye; it never hides or rewrites a line.
 */
export function SourceFileView({ url, kind, highlight }: SourceFileViewProps) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
        return res.text();
      })
      .then((t) => active && setText(t))
      .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [url]);

  const banner = (
    <div className="banner ok">
      Raw source file shipped with the engine, shown unmodified.{" "}
      <a href={url} target="_blank" rel="noopener noreferrer">
        Open in a new tab
      </a>{" "}
      or{" "}
      <a href={url} download>
        download
      </a>
      .
    </div>
  );

  if (error) {
    return (
      <>
        {banner}
        <p className="hint">{error}</p>
      </>
    );
  }
  if (text === null) {
    return (
      <>
        {banner}
        <p className="hint">Loading…</p>
      </>
    );
  }

  return (
    <>
      {banner}
      {kind === "csv" ? (
        <CsvTable text={text} highlight={highlight} />
      ) : (
        <YamlText text={text} highlight={highlight} />
      )}
    </>
  );
}

/** Renders the holdings CSV as a table; rows in the highlighted asset class are marked. */
function CsvTable({ text, highlight }: { text: string; highlight?: string | null }) {
  const rows = text
    .trim()
    .split("\n")
    .map((line) => line.split(","));
  const header = rows[0] ?? [];
  const body = rows.slice(1);
  // The asset-class column is what allocation figures sum over; match on it to spotlight a figure's rows.
  const assetClassIdx = header.findIndex((h) => norm(h) === "asset_class");
  const target = highlight ? norm(highlight) : null;

  return (
    <div className="source-file">
      <table className="source-csv">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((cells, r) => {
            const isHit =
              target != null && assetClassIdx >= 0 && norm(cells[assetClassIdx] ?? "") === target;
            return (
              <tr key={r} className={isHit ? "row-hit" : ""}>
                {cells.map((c, i) => (
                  <td key={i} className={header[i] === "market_value_sgd" ? "num" : ""}>
                    {c}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Renders the formula registry as monospace text; lines containing the highlight are marked. */
function YamlText({ text, highlight }: { text: string; highlight?: string | null }) {
  const target = highlight ? norm(highlight) : null;
  const lines = text.split("\n");
  return (
    <div className="source-file">
      <pre className="source-yaml">
        {lines.map((line, i) => {
          const isHit = target != null && target.length > 0 && norm(line).includes(target);
          return (
            <div key={i} className={isHit ? "line-hit" : ""}>
              {line || " "}
            </div>
          );
        })}
      </pre>
    </div>
  );
}
