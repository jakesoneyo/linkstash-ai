import type { Link } from "../lib/schemas";
import { LinkCard } from "./LinkCard";

interface LinkGridProps {
  links: Link[];
  onRetry: (id: string) => void;
}

/**
 * 카드 그리드 — DESIGN.md: 카드 사이 1px 보더 간격(그리드 라인 느낌).
 * 컨테이너 배경을 border 컬러로 깔고 gap:1px을 주면, 카드(surface 배경) 사이로
 * 1px 라인이 보이는 효과를 별도 border 유틸 없이 만들 수 있다.
 */
export function LinkGrid({ links, onRetry }: LinkGridProps) {
  return (
    <div
      className="grid gap-px bg-border"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
    >
      {links.map((link) => (
        <LinkCard key={link.id} link={link} onRetry={onRetry} />
      ))}
    </div>
  );
}
