import type { LlmExchange } from "../types";
import { LlmExchangeBody } from "./LlmExchangeBody";

interface Props {
  exchange: LlmExchange | null | undefined;
  model: string;
}

/**
 * The Rule extractor tab: the verbatim prompt sent to the LLM and the reply it returned, kept on a
 * persistent tab (not just the post-run popup) so a reviewer can read exactly how the fund guidelines
 * were turned into rules. The model never touches the figures themselves it only proposes the rule
 * intents; the engine then computes and traces every figure deterministically from them.
 *
 * <p>{@code exchange} is absent when no LLM run produced this bundle (a static fallback bundle, or
 * before the extractor has been run), in which case the tab explains how to populate it.
 */
export function RuleExtractorView({ exchange, model }: Props) {
  return (
    <div className="extractor-view">
      <div className="banner ok">
        The full exchange with the rule-extractor model, shown verbatim. The LLM only interprets the
        guideline text into rule intents; it never computes a figure. Every number is then derived
        deterministically from these rules and traced through the graph.
      </div>

      {exchange ? (
        <div className="panel">
          <LlmExchangeBody exchange={exchange} />
        </div>
      ) : (
        <div className="panel">
          <p className="hint">
            No LLM exchange is recorded in this report. It is populated when the engine runs the LLM
            rule extractor live{model ? <> (model <span className="mono">{model}</span>)</> : null}.
            Run the extractor from the landing screen, or ensure the live backend is reachable, to see
            the prompt and reply here.
          </p>
        </div>
      )}
    </div>
  );
}
