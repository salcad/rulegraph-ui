import type { Firewall } from "../types";

/** Shows the generated commentary and the firewall result that proves it added no number. */
export function FirewallView({ firewall }: { firewall: Firewall }) {
  const { narrative, check } = firewall;
  return (
    <>
      <div className={`banner ${check.pass ? "ok" : "bad"}`}>
        {check.pass
          ? `Firewall passed. All ${check.numbers_in_narrative} numbers in the narrative are present in the computed output.`
          : `Firewall failed. The narrative introduced ${check.violations.length} number(s) not in the computed output.`}
      </div>

      {!check.pass && (
        <div className="error-box" style={{ marginBottom: 14 }}>
          Violations: {check.violations.join(", ")}
        </div>
      )}

      <h3 style={{ marginBottom: 6 }}>Narrative commentary</h3>
      <div className="narrative">{narrative}</div>

      <p style={{ color: "var(--muted)", marginTop: 12 }}>
        The narrative layer may write prose only. Every number it mentions is copied from a computed
        figure; the firewall scans the text and would flag any number the narrative introduced on its
        own.
      </p>
    </>
  );
}
