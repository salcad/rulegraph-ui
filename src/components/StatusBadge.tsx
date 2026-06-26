import type { FigureStatus } from "../types";

const LABEL: Record<FigureStatus, string> = {
  OK: "OK",
  AT_LIMIT: "AT LIMIT",
  BREACH: "BREACH",
  ERROR: "ERROR",
};

/** Colour-coded compliance status pill. */
export function StatusBadge({ status }: { status: FigureStatus }) {
  return <span className={`badge ${status.toLowerCase()}`}>{LABEL[status]}</span>;
}

/** Plain pass/fail marker used by the check views. */
export function PassFail({ pass }: { pass: boolean }) {
  return <span className={`pf ${pass ? "pass" : "fail"}`}>{pass ? "PASS" : "FAIL"}</span>;
}
