// Shapes of the report bundle the engine exports (snake_case, as written by the backend).

export type FigureStatus = "OK" | "AT_LIMIT" | "BREACH" | "ERROR";

export interface Citation {
  source_doc: string;
  page: number | null;
  chunk_id: string;
  passage_summary: string;
}

export interface FigureInput {
  name: string;
  value: number;
  description: string;
  query: string;
}

export interface Figure {
  figure: string;
  value: string | null;
  status: FigureStatus;
  limit: string | null;
  utilization: string | null;
  formula: string | null;
  inputs: FigureInput[] | null;
  graph_path: string | null;
  citation: Citation | null;
  numeric_value: number | null;
}

export interface FirmConfig {
  firm_id: string;
  include_fallen_angels: boolean;
  gre_group_by: string;
  utilization_format: string;
}

export interface ReconciliationLine {
  figure: string;
  pass: boolean;
  computed_value: string | null;
  expected_value: string | null;
  delta: number | null;
  value_match: boolean;
  status_match: boolean;
  utilization_match: boolean;
}

export interface ReconciliationReport {
  lines: ReconciliationLine[];
  passed: number;
  total: number;
}

export interface TraceabilityLine {
  figure: string;
  chunk_id: string | null;
  has_graph_path: boolean;
  chunk_exists: boolean;
  pass: boolean;
}

export interface TraceabilityReport {
  lines: TraceabilityLine[];
  passed: number;
  total: number;
}

export interface FirewallCheck {
  allowed_numbers: number;
  numbers_in_narrative: number;
  violations: string[];
  pass: boolean;
}

export interface Firewall {
  narrative: string;
  check: FirewallCheck;
}

export interface AuditEvent {
  seq: number;
  run_id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// The verbatim prompt sent to the LLM rule extractor and the reply it returned. Present only for an
// LLM run. When `fell_back` is true the seed extractor produced the rules instead (no API key, an
// error, or an empty result) and `note` explains why; `reply` may then be empty.
export interface LlmExchange {
  model: string;
  system_prompt: string;
  user_prompt: string;
  reply: string;
  fell_back: boolean;
  note: string | null;
  // The raw seed_rules.json actually used, present only on a fallback run so the viewer can show the
  // cached rule set; absent on a successful LLM run.
  seed_rules?: string | null;
}

export interface ReportBundle {
  firm: FirmConfig;
  figures: Figure[];
  reconciliation: ReconciliationReport;
  traceability: TraceabilityReport;
  firewall: Firewall;
  audit: AuditEvent[];
  // Configured LLM model id (e.g. "anthropic/claude-sonnet-4.6"), always present so the viewer can
  // label the LLM extractor with the model it would use, even before any LLM run.
  llm_model: string;
  llm_exchange?: LlmExchange | null;
}

export type FirmId = "firm_A" | "firm_B";

// Which rule extractor the engine should use for a run: the deterministic hardcoded baseline, or the
// LLM-backed extractor that interprets the guideline text.
export type ExtractorMode = "seed" | "llm";

// Firm-method mini-DSL live preview (the "Method DSL" tab).
export interface DslError {
  line: number;
  message: string;
}

export interface FirmMethodPreview {
  config: FirmConfig;
  valid: boolean;
  errors: DslError[];
  explanation: string[];
  figures: Figure[] | null;
  figures_note: string | null;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

export interface GraphView {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
