import type { LlmExchange } from "../types";

/**
 * The verbatim LLM rule-extraction exchange, rendered without a container so it can sit in either the
 * post-run popup ({@link LlmExchangeModal}) or the persistent Rule extractor tab.
 *
 * <p>On a successful live run it shows the model id, the verbatim system/user prompts, and the reply.
 * When the run fell back to the deterministic seed set (no API key, an invalid key, an error, or an
 * empty reply) the prompt/reply is suppressed and only a warning plus the cached seed rules are
 * shown: the demo is still valid because the rules came from the bundled seed JSON, treated as a
 * cached extraction. The engine-unreachable case (no prompt was ever built) shows just its note.
 */
export function LlmExchangeBody({ exchange }: { exchange: LlmExchange }) {
  // A prompt is only present when the engine actually ran the extractor. Its absence means the engine
  // was unreachable and the static bundle was served, which the note explains on its own.
  const enginePreparedPrompt =
    exchange.system_prompt.trim() !== "" || exchange.user_prompt.trim() !== "";

  if (exchange.fell_back) {
    return (
      <div className="llm-exchange">
        <div className="llm-fallback" role="alert">
          {exchange.note ?? "Fell back to the deterministic seed extractor."}
        </div>

        {enginePreparedPrompt && (
          <p className="llm-fallback-explain">
            The demo still runs and every figure is valid. The rules came from the bundled{" "}
            <span className="mono">seed_rules.json</span> the approved rule set, in the exact JSON
            shape the LLM returns. Treat it as a cached extraction: the engine still computes and
            traces each figure from these rules, it just skipped the live model call. Set a valid{" "}
            <span className="mono">OPENROUTER_API_KEY</span> to run the LLM live instead.
          </p>
        )}

        {/* Even on a fallback, the prompt the engine prepared is shown verbatim, so the extractor is
            fully transparent: you see exactly what would have been sent (and any reply received)
            alongside the seed rules that were used instead. */}
        {enginePreparedPrompt && (
          <>
            <p className="llm-meta">
              Prompt prepared for model <span className="mono">{exchange.model}</span>
            </p>

            <section>
              <h4>System prompt</h4>
              <pre className="llm-block">{exchange.system_prompt}</pre>
            </section>

            <section>
              <h4>User prompt</h4>
              <pre className="llm-block">{exchange.user_prompt}</pre>
            </section>

            {exchange.reply.trim() && (
              <section>
                <h4>Reply (not usable, seed rules used instead)</h4>
                <pre className="llm-block">{exchange.reply}</pre>
              </section>
            )}
          </>
        )}

        {exchange.seed_rules && (
          <section>
            <h4>Cached seed_rules.json</h4>
            <pre className="llm-block">{exchange.seed_rules}</pre>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="llm-exchange">
      <p className="llm-meta">
        Model <span className="mono">{exchange.model}</span>
      </p>

      <section>
        <h4>System prompt</h4>
        <pre className="llm-block">{exchange.system_prompt}</pre>
      </section>

      <section>
        <h4>User prompt</h4>
        <pre className="llm-block">{exchange.user_prompt}</pre>
      </section>

      <section>
        <h4>Reply</h4>
        <pre className="llm-block">
          {exchange.reply.trim() ? exchange.reply : "(no reply returned)"}
        </pre>
      </section>
    </div>
  );
}
