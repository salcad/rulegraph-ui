import { useEffect, useState } from "react";
import { loadHoldingsCsv, restoreHoldingsCsv, saveHoldingsCsv } from "../api";

/**
 * The perturbation control for the reconciliation demo. It loads the exact holdings CSV the pipeline
 * ingests into an editable text area; saving overwrites that file and re-runs the pipeline, so an
 * edited holding flows through and the figures move away from the answer key. "Restore original" puts
 * the engine's pre-edit snapshot back. This proves the figures are computed from the inputs, not an
 * echo of the answer key: change the inputs and the deltas stop being zero.
 */
export function HoldingsEditor({ onRerun, running }: { onRerun: () => void; running?: boolean }) {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (open && csv === null) {
      loadHoldingsCsv()
        .then(setCsv)
        .catch((e) => setError(String(e)));
    }
  }, [open, csv]);

  async function save() {
    if (csv === null) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await saveHoldingsCsv(csv);
      setNote("Holdings saved. Re-running the pipeline against the edited input…");
      onRerun();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await restoreHoldingsCsv();
      const fresh = await loadHoldingsCsv();
      setCsv(fresh);
      setNote("Original holdings restored. Re-running the pipeline…");
      onRerun();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="perturb">
      <button className="perturb-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? "▾ " : "▸ "}Edit the holdings and re-run
      </button>
      {open && (
        <div className="perturb-body">
          <p className="perturb-hint">
            This is the exact holdings file the engine reads. Change a value, save, and the figures
            are recomputed from the edited data, so the deltas against the answer key stop being zero.
            Restore the original to return to a clean 13 of 13.
          </p>
          <textarea
            className="perturb-csv mono"
            spellCheck={false}
            value={csv ?? "Loading…"}
            disabled={csv === null || busy}
            onChange={(e) => setCsv(e.target.value)}
          />
          <div className="perturb-actions">
            <button onClick={save} disabled={busy || running || csv === null}>
              {busy ? "Saving…" : "Save & re-run"}
            </button>
            <button onClick={restore} disabled={busy || running}>
              Restore original
            </button>
          </div>
          {error && <div className="perturb-error">{error}</div>}
          {note && !error && <div className="perturb-note">{note}</div>}
        </div>
      )}
    </div>
  );
}
