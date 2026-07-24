import type { LinkStatus } from "../lib/schemas";

// 상태 뱃지 — DESIGN.md: 4px 사각형 도트 + 모노 라벨, 브랜드 액센트와 분리된 시맨틱 컬러.
const STATUS_CONFIG: Record<
  LinkStatus,
  { label: string; dot: string; text: string }
> = {
  READY: { label: "ready", dot: "bg-ok", text: "text-ok" },
  PENDING: { label: "pending", dot: "bg-warn", text: "text-warn" },
  FAILED: { label: "failed", dot: "bg-danger", text: "text-danger" },
};

export function StatusBadge({ status }: { status: LinkStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide ${cfg.text}`}
    >
      <span className={`h-1 w-1 shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
