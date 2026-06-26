import type { AuditEvent } from "../types";

/** The append-only audit trail for the run, in order. */
export function AuditView({ events }: { events: AuditEvent[] }) {
  return (
    <>
      <div className="banner ok">
        {events.length} events recorded to the append-only audit log for this run.
      </div>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Event</th>
              <th>Time</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.seq}>
                <td className="num">{e.seq}</td>
                <td>{e.type}</td>
                <td className="mono">{e.timestamp}</td>
                <td className="mono">{JSON.stringify(e.data)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
