import type { LlmExchange } from "../types";
import { Modal } from "./Modal";
import { LlmExchangeBody } from "./LlmExchangeBody";

interface Props {
  exchange: LlmExchange;
  onClose: () => void;
}

/**
 * The post-run popup shown after an LLM rule-extraction run loads, so the operator sees exactly what
 * was asked and answered before reading the figures. The same exchange is also available any time on
 * the Rule extractor tab; both render {@link LlmExchangeBody}.
 */
export function LlmExchangeModal({ exchange, onClose }: Props) {
  return (
    <Modal title="LLM rule extraction" onClose={onClose}>
      <LlmExchangeBody exchange={exchange} />
    </Modal>
  );
}
