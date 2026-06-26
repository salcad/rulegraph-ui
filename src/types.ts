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

export interface ReportBundle {
  firm: FirmConfig;
  figures: Figure[];
  reconciliation: ReconciliationReport;
  traceability: TraceabilityReport;
  firewall: Firewall;
  audit: AuditEvent[];
}

export type FirmId = "firm_A" | "firm_B";

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
