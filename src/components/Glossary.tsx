import { useMemo, useState } from "react";

interface Term {
  term: string;
  def: string;
}

interface Section {
  title: string;
  note?: string;
  terms: Term[];
}

/**
 * A static reference for every piece of vocabulary the report uses: formula variables, the figures
 * and limits, the graph model, the firm-config switches, and the audit terms. It is self-contained
 * (no backend data) so it always renders, and it doubles as an onboarding aid for a new reviewer.
 */
const SECTIONS: Section[] = [
  {
    title: "Formula variables",
    note: "The names that appear in a figure's formula. The graph traversal binds each to a value, then the registry formula combines them. They are generic on purpose, so one formula can serve many figures.",
    terms: [
      {
        term: "subject_mv",
        def: "Short for subject market value. It is the market value of whatever the figure measures: the asset class for an allocation, the largest issuer for a concentration, the liquid buckets for the liquidity ratio. It is the numerator of a percent-of-NAV figure. The name is generic so the same formula (subject_mv / nav * 100) covers every such figure.",
      },
      {
        term: "nav",
        def: "Net Asset Value. The total market value of the fund, that is the sum of every position's market value. It is the denominator for the percentage limits, which the guidelines state as a percent of NAV.",
      },
      {
        term: "duration_weighted_sum",
        def: "The sum of (market value times modified duration) over all positions. It is the shared numerator for the two interest-rate figures: portfolio duration (divided by NAV) and DV01 (times 0.0001).",
      },
    ],
  },
  {
    title: "Computation and formulas",
    terms: [
      {
        term: "formula registry (DSL)",
        def: "The config file (formulas.yaml) that holds each figure's arithmetic as a small expression. A restricted, deterministic engine evaluates it, never the language model, and the run hashes it into the audit log so the exact arithmetic is provable.",
      },
      {
        term: "utilisation",
        def: "How much of a limit is used: value divided by limit. Shown as a percentage (Firm A) or truncated basis points (Firm B).",
      },
      {
        term: "modified duration",
        def: "A bond's price sensitivity to interest-rate moves, expressed in years. The portfolio figure is the market-value-weighted average across holdings.",
      },
      {
        term: "DV01",
        def: "Short for dollar value of 1 basis point. The change in portfolio value for a 1bp rate move, approximated as the sum of (market value times modified duration) times 0.0001.",
      },
      {
        term: "basis point (bp)",
        def: "One hundredth of a percent, that is 0.0001. It appears in the DV01 figure and in Firm B's utilisation format.",
      },
      {
        term: "status: OK, AT_LIMIT, BREACH, ERROR",
        def: "OK means inside the limit. AT_LIMIT means exactly at the cap. BREACH means outside the limit. ERROR means the figure could not be traced through the graph, so it is not emitted as a value.",
      },
    ],
  },
  {
    title: "Figures and limits",
    terms: [
      { term: "allocation %", def: "An asset class's market value as a percentage of NAV, tested against its min to max band (guidelines Section 2)." },
      { term: "non-IG aggregate", def: "Combined exposure to non-investment-grade instruments (High Yield plus Structured Credit) as a percent of NAV, capped at 20%." },
      { term: "IG and non-IG", def: "Investment Grade (rated BBB-/Baa3 or above) versus below it. Non-IG is riskier and capped in aggregate." },
      { term: "fallen angel", def: "A bond downgraded from investment grade to below it. Under Firm B's convention these count toward the non-IG aggregate even if their asset class does not." },
      { term: "single-issuer concentration", def: "The largest exposure to one corporate issuer as a percent of NAV, capped at 8% so the fund is not over-reliant on a single name." },
      { term: "GRE (government-related entity)", def: "An issuer linked to the government, such as a statutory board or GLC. It has its own concentration cap of 12%." },
      { term: "group concentration and parent rollup", def: "Concentration measured per issuer (Firm A) or per shared parent issuer (Firm B), so entities under one parent are tested together." },
      { term: "liquidity ratio", def: "Liquid assets (SGS plus MAS Bills plus Cash) as a percent of NAV, against a minimum floor of 25%." },
    ],
  },
  {
    title: "Knowledge graph (nodes and relationships)",
    note: "A figure's graph path is a chain of these. Nodes are written (Label:name) and relationships are written -[:TYPE]->.",
    terms: [
      { term: "Position", def: "One holding from the holdings file: an instrument with a market value and modified duration." },
      { term: "AssetClass", def: "A category such as Singapore Government Securities. Positions roll up to it and limits hang off it." },
      { term: "Limit, ConcentrationLimit, LiquidityFloor", def: "The threshold a figure is tested against (a band, a cap, or a floor), carrying min and max values." },
      { term: "RiskMetric, Threshold", def: "A risk measure (duration, DV01) and its bound. The rule side for the interest-rate figures." },
      { term: "Issuer, ParentIssuer", def: "Who issued a position, and the parent it rolls up to. Used by group concentration." },
      { term: "GuidelineChunk", def: "A chunk of text from the guidelines PDF (for example chunk_1cc8). It is the end of every trace, the source passage that justifies a limit." },
      { term: "IN_ASSET_CLASS", def: "Position to AssetClass: the holding belongs to that class. This selects which positions feed a figure." },
      { term: "HAS_LIMIT, HAS_THRESHOLD", def: "AssetClass to Limit, or RiskMetric to Threshold: the class or metric carries this limit." },
      { term: "DEFINED_BY", def: "Limit to GuidelineChunk: the limit is defined by this source passage. This is the last hop of a trace." },
      { term: "CONTRIBUTES_TO", def: "AssetClass to Aggregate or LiquidityFloor: this class feeds an aggregate or liquid bucket." },
      { term: "ISSUED_BY, ROLLS_UP_TO", def: "Position to Issuer, and Issuer to ParentIssuer: the issuer chain used for concentration figures." },
    ],
  },
  {
    title: "Firms and configuration",
    terms: [
      { term: "Firm A and Firm B", def: "Two administrators of the same fund and holdings. Firm B differs on three house conventions, expressed as config, so switching firms changes no engine code." },
      { term: "include_fallen_angels", def: "Firm config flag for whether downgraded-below-IG positions count toward the non-IG aggregate. Firm B sets it on." },
      { term: "gre group_by (issuer or parent_issuer)", def: "Whether GRE concentration is measured per issuer (Firm A) or per shared parent (Firm B)." },
      { term: "utilization format (percent_1dp or truncated_bps)", def: "How utilisation is rendered: one-decimal percent (Firm A) or truncated basis points (Firm B)." },
    ],
  },
  {
    title: "Audit and traceability",
    terms: [
      { term: "graph path", def: "The chain of nodes and relationships a figure was computed along. It is the proof the figure came through the graph." },
      { term: "citation and chunk_id", def: "The source passage a figure traces to, identified by its chunk id in the guidelines document." },
      { term: "provenance", def: "Recorded on every node and edge: the source document, page, ingestion time, and extraction confidence." },
      { term: "reconciliation", def: "Comparing each computed figure to the firm's answer key, pass or fail with a delta." },
      { term: "firewall (no-LLM-numbers)", def: "A check that the narrative commentary introduces no number absent from the computed figures. The language model may write prose, never a number." },
      { term: "append-only audit log", def: "An immutable, replayable record of a run: graph build, figure computation with the formula hash, reconciliation, config change, and export. No update or delete path exists." },
      { term: "formula sha256", def: "A hash over the formula registry recorded per run, so an examiner can confirm which arithmetic produced the figures and that it was not altered." },
    ],
  },
];

export function Glossary() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return SECTIONS;
    return SECTIONS.map((s) => ({
      ...s,
      terms: s.terms.filter(
        (t) => t.term.toLowerCase().includes(needle) || t.def.toLowerCase().includes(needle),
      ),
    })).filter((s) => s.terms.length > 0);
  }, [q]);

  return (
    <div className="glossary-view">
      <div className="glossary-head">
        <p className="hint" style={{ padding: 0, textAlign: "left", fontStyle: "normal" }}>
          Every term the report uses: formula variables, figures, the graph model, firm config, and
          the audit vocabulary.
        </p>
        <input
          className="glossary-search"
          type="search"
          placeholder="Filter terms (e.g. subject_mv, NAV, DV01, DEFINED_BY)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 && <p className="hint">No terms match “{q}”.</p>}

      {filtered.map((section) => (
        <section key={section.title} className="glossary-section">
          <h3>{section.title}</h3>
          {section.note && <p className="glossary-note">{section.note}</p>}
          <dl className="glossary-terms">
            {section.terms.map((t) => (
              <div key={t.term} className="glossary-row">
                <dt className="mono">{t.term}</dt>
                <dd>{t.def}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
