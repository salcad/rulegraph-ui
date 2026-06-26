import type { ReconciliationReport } from "../types";
import { readable } from "../api";
import { PassFail } from "./StatusBadge";

/** Per-figure comparison against the firm's answer key, with the numeric delta. */
export function ReconciliationView({ report }: { report: ReconciliationReport }) {
  const allPass = report.passed === report.total;
  return (
    <>
      <div className={`banner ${allPass ? "ok" : "bad"}`}>
        {report.passed} of {report.total} figures reconcile to the answer key
        {allPass ? ", every delta is zero." : "."}
      </div>
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
