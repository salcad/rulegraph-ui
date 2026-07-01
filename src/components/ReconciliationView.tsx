import type { ReconciliationReport } from "../types";
import { readable } from "../api";
import { PassFail } from "./StatusBadge";
import { HoldingsEditor } from "./HoldingsEditor";

/**
 * Per-figure comparison against the firm's answer key, with the numeric delta. The engine computes
 * every figure from the inputs (holdings + guidelines) without consulting the answer key; this tab
 * shows the computed value beside the key with a delta of zero. The "Re-run pipeline" button re-runs
 * the whole pipeline live so the match is reproducible on demand, not a one-off export.
 */
export function ReconciliationView({
  report,
  onRerun,
  running,
  source,
}: {
  report: ReconciliationReport;
  onRerun?: () => void;
  running?: boolean;
  source?: "live" | "static";
}) {
  const allPass = report.passed === report.total;

  return (
    <>
      <div className="recon-toolbar">
        {onRerun && (
          <button onClick={onRerun} disabled={running}>
            {running ? "Re-running…" : "Re-run pipeline"}
          </button>
        )}
        {source && (
          <span className={`chip ${source === "live" ? "good" : ""}`}>
            {source === "live" ? (
              <>computed <b>live</b> by the engine</>
            ) : (
              <>showing the <b>exported</b> bundle (backend unreachable)</>
            )}
          </span>
        )}
      </div>

      <div className={`banner ${allPass ? "ok" : "bad"}`}>
        {report.passed} of {report.total} figures reconcile to the answer key
        {allPass ? ", every delta is zero." : "."}
      </div>

      {onRerun && <HoldingsEditor onRerun={onRerun} running={running} />}

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Figure</th>
              <th className="num">Computed</th>
              <th className="num">Expected</th>
              <th className="num">Delta</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {report.lines.map((l) => (
              <tr key={l.figure}>
                <td>{readable(l.figure)}</td>
                <td className="num">{l.computed_value ?? "n/a"}</td>
                <td className="num">{l.expected_value ?? "(none)"}</td>
                <td className="num">{l.delta == null ? "n/a" : trimDelta(l.delta)}</td>
                <td>
                  <PassFail pass={l.pass} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function trimDelta(d: number): string {
  return d === 0 ? "0" : String(d);
}
