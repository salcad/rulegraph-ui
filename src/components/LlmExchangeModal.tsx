import type { LlmExchange } from "../types";
import { Modal } from "./Modal";

interface Props {
  exchange: LlmExchange;
  onClose: () => void;
}

/**
 * Opened after an LLM rule-extraction run loads.
 *
 * <p>On a successful live run it shows the verbatim system/user prompt and the model's reply. When
 * the run fell back to the deterministic seed set (no API key, an invalid key, an error, or an empty
 * reply) the prompt/reply is suppressed and only a warning is shown: the demo is still valid because
 * the rules came from the bundled seed JSON, which is treated as a cached extraction. The
 * engine-unreachable case (no prompt was ever built) shows just its own explanatory note.
 */
export function LlmExchangeModal({ exchange, onClose }: Props) {
  // A prompt is only present when the engine actually ran the extractor. Its absence means the engine
  // was unreachable and the static bundle was served, which the note explains on its own.
  const enginePreparedPrompt =
    exchange.system_prompt.trim() !== "" || exchange.user_prompt.trim() !== "";

  if (exchange.fell_back) {
    return (
      <Modal title="LLM rule extraction" onClose={onClose}>
        <div className="llm-exchange">
          <div className="llm-fallback" role="alert">
            {exchange.note ?? "Fell back to the deterministic seed extractor."}
          </div>

          {enginePreparedPrompt && (
            <p className="llm-fallback-explain">
              The demo still runs and every figure is valid. The rules came from the bundled{" "}
              <span className="mono">seed_rules.json</span> &mdash; the approved rule set, in the
              exact JSON shape the LLM returns. Treat it as a cached extraction: the engine still
              computes and traces each figure from these rules, it just skipped the live model call.
              Set a valid <span className="mono">OPENROUTER_API_KEY</span> to run the LLM live instead.
            </p>
          )}

          {exchange.seed_rules && (
            <section>
              <h4>Cached rule set &mdash; seed_rules.json</h4>
              <pre className="llm-block">{exchange.seed_rules}</pre>
            </section>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="LLM rule extraction" onClose={onClose}>
      <div className="llm-exchange">
        <p className="llm-meta">
          Model <span className="mono">{exchange.model}</span>
        </p>

        <section>
          <h4>Prompt &mdash; system</h4>
          <pre className="llm-block">{exchange.system_prompt}</pre>
        </section>

        <section>
          <h4>Prompt &mdash; user</h4>
          <pre className="llm-block">{exchange.user_prompt}</pre>
        </section>

        <section>
          <h4>Reply</h4>
          <pre className="llm-block">
            {exchange.reply.trim() ? exchange.reply : "(no reply returned)"}
          </pre>
        </section>
      </div>
    </Modal>
  );
}
