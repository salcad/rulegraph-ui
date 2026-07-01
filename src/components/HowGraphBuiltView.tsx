/**
 * The "How it's built" tab: a plain-English walkthrough of how the approved rule set (seed_rules.json,
 * or the same JSON shape an LLM returns) becomes the Neo4j knowledge graph the figures are traced
 * through. It is static reference content, not data from a run: it explains the mechanism so the graph
 * is not a mystery, then points back at the live Graph and Traceability tabs to see it for real.
 */

interface RuleTypeRow {
  type: string;
  nodes: string;
  edges: string;
}

const RULE_TYPES: RuleTypeRow[] = [
  { type: "ALLOCATION_LIMIT", nodes: "AssetClass + Limit", edges: "HAS_LIMIT" },
  { type: "EXPOSURE_LIMIT", nodes: "Aggregate", edges: "CONTRIBUTES_TO from each contributing class" },
  { type: "CONCENTRATION_LIMIT", nodes: "ConcentrationLimit", edges: "none" },
  { type: "LIQUIDITY_FLOOR", nodes: "LiquidityFloor", edges: "CONTRIBUTES_TO from each contributing class" },
  { type: "RISK_METRIC", nodes: "RiskMetric + Threshold", edges: "optional ON_BREACH → BreachAction → OWNED_BY → Owner" },
];

const PIPELINE = `seed_rules.json ──► SeedRuleExtractor ──► RuleIntentJsonMapper ──► IngestionService ──► GraphBuilderService ──► Neo4j
   (raw text)        (loads resource)      (JSON → RuleIntent,       (orchestrates)      (Cypher MERGE writes)
                                            gates + provenance)`;

const INGEST_SNIPPET = `String chunkId = Hashing.chunkId(page, passage);   // e.g. "chunk_1cc8"
chunks.add(new GuidelineChunk(chunkId, page, passage, summarize(passage), prov));`;

const SEED_SNIPPET = `{ "rule_type": "ALLOCATION_LIMIT",
  "target_code": "singapore_government_securities",
  "formula_key": "ALLOCATION_PERCENT",
  "min_value": 20, "max_value": 60,
  "source_keyword": "Singapore Government Securities", ... }`;

const CYPHER = `MERGE (ac:AssetClass {code: 'singapore_government_securities'})
MERGE (lim:Limit {code: 'singapore_government_securities'})
  SET lim.type='ALLOCATION', lim.min=20, lim.max=60,
      lim.formula_key='ALLOCATION_PERCENT'
MERGE (ac)-[:HAS_LIMIT]->(lim)
WITH lim
MATCH (g:GuidelineChunk {chunk_id: $chunkId})
MERGE (lim)-[:DEFINED_BY]->(g)`;

const TRACE_PATH =
  "(Position:SGS-01)-[:IN_ASSET_CLASS]->(AssetClass:singapore_government_securities)" +
  "-[:HAS_LIMIT]->(Limit)-[:DEFINED_BY]->(GuidelineChunk)";

export function HowGraphBuiltView() {
  return (
    <div className="how-view">
      <div className="banner ok">
        How the approved rule set becomes the Neo4j graph the figures are traced through. The same
        JSON shape feeds this whether it comes from the frozen{" "}
        <span className="mono">seed_rules.json</span> or a live LLM reply, so the mechanism below is
        identical for both.
      </div>

      <section className="how-section">
        <h3>The pipeline, in four hops</h3>
        <pre className="how-flow mono">{PIPELINE}</pre>
        <ol className="how-list">
          <li>
            <strong>Load.</strong> <span className="mono">SeedRuleExtractor</span> reads{" "}
            <span className="mono">seed_rules.json</span> off the classpath as plain text and hands it
            to the mapper. (On a live run, the LLM reply takes its place.)
          </li>
          <li>
            <strong>Parse and validate.</strong>{" "}
            <span className="mono">RuleIntentJsonMapper</span> reads each entry in the JSON and turns
            it into a <span className="mono">RuleIntent</span>, the internal object the rest of the
            engine works with. As it goes it throws away anything it cannot safely act on, for two
            reasons:
            <ul className="how-sublist">
              <li>
                <strong>It only accepts rules it knows how to compute.</strong> Every entry names a{" "}
                <span className="mono">rule_type</span> (what kind of limit this is) and a{" "}
                <span className="mono">formula_key</span> (which arithmetic computes it). If either is
                not one the engine recognises, the whole entry is dropped rather than trusted. This
                matters most on a live LLM run, which can invent a plausible-looking rule the engine
                has no calculator for. (The code calls this gate G1.)
              </li>
              <li>
                <strong>It keeps only one rule per thing being limited.</strong> Each entry has a{" "}
                <span className="mono">target_code</span>: the item the rule applies to, such as{" "}
                <span className="mono">cash</span> or <span className="mono">portfolio_dv01</span>. If
                two entries target the same code, only the first is kept. Otherwise both would write to
                the same graph node and silently overwrite each other&apos;s limits, and the figure
                would be checked against the wrong number. (Gate G1b.)
              </li>
              <li>
                <strong>It records where each rule came from.</strong> Every entry carries a citation
                back to the guideline passage that justifies it: a live LLM emits a{" "}
                <span className="mono">source_chunk_id</span> (validated against the chunks actually
                parsed from the PDF), while the frozen seed file carries a{" "}
                <span className="mono">source_keyword</span> matched to the first chunk whose text
                contains it. Either way the rule ends up anchored to a real passage. If neither
                resolves, the rule is marked <span className="mono">chunk_unresolved</span> so it
                surfaces as untraceable rather than carrying a made-up citation. (This is the{" "}
                <em>provenance</em> in the diagram above; the mechanics are in section (b) below.)
              </li>
            </ul>
          </li>
          <li>
            <strong>Orchestrate.</strong> <span className="mono">IngestionService</span> parses the
            PDF into chunks and the CSV into positions, runs the extractor, then calls{" "}
            <span className="mono">graphBuilder.build(chunks, intents, positions)</span>. This hop is
            also where the <span className="mono">chunk_id</span> comes from, which answers a question
            the seed file leaves open: there is no <span className="mono">chunk_id</span> anywhere in{" "}
            <span className="mono">seed_rules.json</span>, because ids are not written by hand.
            <ul className="how-sublist">
              <li>
                <strong>Each PDF passage is hashed into a stable id.</strong> As{" "}
                <span className="mono">GuidelinePdfParser</span> walks the pages it calls{" "}
                <span className="mono">Hashing.chunkId(page, passage)</span>, producing a deterministic
                id such as <span className="mono">chunk_1cc8</span> from the passage text itself. Same
                PDF in, same id out, so the ids are reproducible across runs rather than assigned by
                position or a counter.
                <pre className="how-code mono">{INGEST_SNIPPET}</pre>
                So <span className="mono">chunk_1cc8</span> (the id selected in{" "}
                <span className="mono">TraceCypherTest</span>) is a deterministic hash of a specific
                PDF passage. This is where ids are born: same PDF in, same id out (constraint 1,
                reproducibility).
              </li>
              <li>
                <strong>The rule borrows one of those ids, it does not carry its own.</strong> This is
                why the seed file ships a <span className="mono">source_keyword</span> instead: the
                mapper (hop 2) resolves that keyword to the id of the first chunk whose text contains
                it, so the rule ends up anchored to a real, freshly-hashed{" "}
                <span className="mono">chunk_id</span> even after the PDF is re-parsed.
              </li>
            </ul>
          </li>
          <li>
            <strong>Write to Neo4j.</strong> <span className="mono">GraphBuilderService</span> builds
            the whole graph in one transaction, in a fixed order: first it clears whatever was there,
            then writes the guideline chunks, then each rule, then each holding. Four details are
            what make the result trustworthy:
            <ul className="how-sublist">
              <li>
                <strong>The guideline chunks become nodes keyed by their hashed id.</strong> Each
                chunk from hop 3 is written as a{" "}
                <span className="mono">GuidelineChunk {"{chunk_id: ...}"}</span> node (with its page,
                text, and summary). That id-keyed node is the exact target every rule&apos;s{" "}
                <span className="mono">DEFINED_BY</span> edge points at, which is how a{" "}
                <span className="mono">chunk_id</span> ends up as a real graph property and how the
                trace reaches an actual passage rather than a label.
              </li>
              <li>
                <strong>It clears the graph first.</strong> The build opens with{" "}
                <span className="mono">MATCH (n) DETACH DELETE n</span>, which deletes every node and
                every relationship currently in the database. So each build starts from an empty graph
                and reflects exactly the inputs of this run, never a leftover node from a previous one.
              </li>
              <li>
                <strong>It reuses nodes instead of duplicating them.</strong> Every write uses{" "}
                <span className="mono">MERGE</span>, which means &ldquo;find the node with this key, or
                create it if none exists, then carry on.&rdquo; This is the important one: when a rule
                and several holdings all <span className="mono">MERGE</span> the same{" "}
                <span className="mono">AssetClass {"{code: ...}"}</span>, they all land on a single
                shared node rather than creating their own copies. That shared node is what later lets
                a figure trace from a holding through to the rule (see the join-key section below).
              </li>
              <li>
                <strong>Values are passed as parameters, not pasted into the query.</strong> The
                code, min, and max are handed to Neo4j as named parameters (
                <span className="mono">$code</span>, <span className="mono">$min</span>, and so on),
                not glued into the query text. The query string stays identical every run, values keep
                their types, and there is no string-injection surprise.
              </li>
            </ul>
            Together, clearing first and merging by key mean the build is{" "}
            <em>idempotent</em>: run it again on the same PDF, CSV, and rules and you get exactly the
            same graph, with nothing piling up.
          </li>
        </ol>
      </section>

      <section className="how-section">
        <h3>Worked example: the SGS rule</h3>
        <p className="how-note">Take the first intent in the file:</p>
        <pre className="how-code mono">{SEED_SNIPPET}</pre>
        <p className="how-note">
          The <span className="mono">ALLOCATION_LIMIT</span> branch of{" "}
          <span className="mono">writeRule()</span> runs this Cypher, with parameters filled from the
          intent:
        </p>
        <pre className="how-code mono">{CYPHER}</pre>
        <p className="how-note">
          So the JSON’s <span className="mono">target_code</span> becomes the node key, min/max/formula
          become node properties, and the rule is anchored to the PDF chunk it came from via{" "}
          <span className="mono">DEFINED_BY</span>.
        </p>
      </section>

      <section className="how-section">
        <h3>The two things that make it click</h3>
        <h4>(a) The canonical code is the join key</h4>
        <p className="how-note">
          The CSV row says <span className="mono">Singapore Government Securities</span>;{" "}
          <span className="mono">writePosition()</span> maps that raw label through{" "}
          <span className="mono">assetClassCodes.toCode(...)</span> to the same code{" "}
          <span className="mono">singapore_government_securities</span>, then{" "}
          <span className="mono">MERGE</span>s on <span className="mono">{"{code}"}</span>. Because the
          rule and the positions both merge on the same key, they resolve to one shared{" "}
          <span className="mono">AssetClass</span> node, which is what makes the trace path real
          rather than decorative:
        </p>
        <pre className="how-code mono">{TRACE_PATH}</pre>
        <p className="how-note">
          SGS-01 (20,000,000) and SGS-02 (15,000,000) hang off that node. That is exactly the{" "}
          <span className="mono">subject_mv</span> of 35,000,000 a figure sums.
        </p>

        <h4>(b) Provenance stays honest</h4>
        <p className="how-note">
          The frozen seed file carries a <span className="mono">source_keyword</span> instead of a hard
          chunk id. <span className="mono">resolveChunkId()</span> finds the first parsed PDF chunk
          whose text contains that keyword and uses its id (a hash of the page text), so the citation
          still points at the genuine passage even if the PDF is re-parsed. Anything that does not
          match becomes <span className="mono">chunk_unresolved</span>, surfaced as untraceable rather
          than a fabricated citation. A live LLM emits <span className="mono">source_chunk_id</span>{" "}
          directly, which the same mapper validates against the parsed chunks.
        </p>
      </section>

      <section className="how-section">
        <h3>The other rule types</h3>
        <p className="how-note">
          <span className="mono">writeRule()</span> switches on{" "}
          <span className="mono">rule_type</span>; each creates a differently-labelled node but all end
          in <span className="mono">DEFINED_BY → GuidelineChunk</span>:
        </p>
        <table className="how-table">
          <thead>
            <tr>
              <th>rule_type</th>
              <th>node(s) created</th>
              <th>extra edges</th>
            </tr>
          </thead>
          <tbody>
            {RULE_TYPES.map((r) => (
              <tr key={r.type}>
                <td className="mono">{r.type}</td>
                <td>{r.nodes}</td>
                <td>{r.edges}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="how-section">
        <h3>What the graph does not contain</h3>
        <p className="how-note">
          <span className="mono">seed_rules.json</span> holds only the limit/threshold values read from
          the guideline text, with no portfolio figures and no arithmetic. Numbers like 35,000,000 are never
          in the JSON or the graph structure; they are computed afterwards by traversing this graph
          (the <span className="mono">subject_mv</span> sum) and applying the{" "}
          <span className="mono">formula_key</span> from{" "}
          <span className="mono">formulas.yaml</span>. The graph stores what a rule is and where it
          came from; the figure is derived on top of it. See the <strong>Traceability</strong> and{" "}
          <strong>Figures</strong> tabs to follow it live.
        </p>
      </section>
    </div>
  );
}
