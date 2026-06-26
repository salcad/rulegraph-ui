import type { LlmExchange } from "../types";
import { Modal } from "./Modal";

interface Props {
  exchange: LlmExchange;
  onClose: () => void;
}

/**
 * Shows the verbatim prompt sent to the LLM rule extractor and the reply it returned, opened when the
 * operator switches to the LLM extractor. When the run fell back to the deterministic seed extractor
 * (no API key, an error, or an empty result) a banner explains why and the reply may be empty. When
 * the engine was unreachable the LLM never ran and there is no prompt to show, so only the warning
 * banner is rendered.
 */
export function LlmExchangeModal({ exchange, onClose }: Props) {
  const hasPrompt = exchange.system_prompt.trim() !== "" || exchange.user_prompt.trim() !== "";

  return (
    <Modal title="LLM rule extraction" onClose={onClose}>
      <div className="llm-exchange">
        {exchange.fell_back && (
          <div className="llm-fallback" role="alert">
            {exchange.note ?? "Fell back to the deterministic seed extractor."}
          </div>
        )}

        {hasPrompt && (
          <>
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
          </>
        )}
      </div>
    </Modal>
  );
}
