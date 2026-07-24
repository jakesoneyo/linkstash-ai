import type { Link } from "../lib/schemas";
import { safeDomain } from "../lib/url";
import { StatusBadge } from "./StatusBadge";
import { RefreshIcon } from "./icons";

interface LinkCardProps {
  link: Link;
  onRetry: (id: string) => void;
  retryPending?: boolean;
}

// 백엔드 failReason 코드(API.md 계약, 영어 그대로 유지)를 화면 표시용 한글 문구로 매핑.
const FAIL_REASON_LABEL: Record<string, string> = {
  CRAWL_ERROR: "페이지를 가져오지 못했습니다",
  LLM_ERROR: "요약 생성에 실패했습니다",
};

function describeFailReason(reason: string | null): string {
  if (!reason) return "처리 중 오류가 발생했습니다";
  return FAIL_REASON_LABEL[reason] ?? "처리 중 오류가 발생했습니다";
}

/**
 * 링크 카드 — status에 따라 3가지 배리언트를 렌더한다(DESIGN.md LinkCard 스펙).
 * 카드 코너는 all-sharp(radius 0)로 그리드 전체를 각지게 유지한다.
 */
export function LinkCard({ link, onRetry, retryPending }: LinkCardProps) {
  const domain = safeDomain(link.url);

  return (
    <div className="flex flex-col gap-2 bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-xs text-muted">{domain}</span>
        <StatusBadge status={link.status} />
      </div>

      {link.status === "PENDING" && (
        <>
          <div className="skeleton-line h-4 w-3/4" />
          <div className="skeleton-line h-3 w-full" />
          <div className="skeleton-line h-3 w-2/3" />
        </>
      )}

      {link.status === "FAILED" && (
        <>
          <p className="truncate text-sm font-semibold text-text">
            {link.title ?? link.url}
          </p>
          <p className="font-mono text-xs text-danger">
            {describeFailReason(link.failReason)}
          </p>
          <button
            type="button"
            onClick={() => onRetry(link.id)}
            disabled={retryPending}
            className="mt-1 flex w-fit items-center gap-1.5 rounded border border-border px-2.5 py-1 font-mono text-xs text-text transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            <RefreshIcon className="h-3 w-3" />
            다시 시도
          </button>
        </>
      )}

      {link.status === "READY" && (
        <>
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-2 text-sm font-semibold text-text hover:text-accent"
          >
            {link.title ?? link.url}
          </a>
          {link.summary && (
            <p className="whitespace-pre-line text-[12.5px] leading-[1.55] text-muted">
              {link.summary}
            </p>
          )}
          {link.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {link.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] text-accent"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
