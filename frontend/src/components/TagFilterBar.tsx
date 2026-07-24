import type { Tag } from "../lib/schemas";

interface TagFilterBarProps {
  tags: Tag[];
  selected: string[];
  onToggle: (name: string) => void;
}

/** 태그 필터 — 모노스페이스 pill 버튼 행, 다중 선택은 AND 조건으로 백엔드에 전달된다. */
export function TagFilterBar({ tags, selected, onToggle }: TagFilterBarProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 border-b border-border bg-surface px-4 py-3 md:px-6">
      {tags.map((tag) => {
        const active = selected.includes(tag.name);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.name)}
            className={`rounded px-2.5 py-1 font-mono text-xs transition-colors ${
              active
                ? "border border-accent bg-accent-soft text-accent"
                : "border border-border text-muted hover:text-text"
            }`}
          >
            {tag.name} <span className="opacity-60">{tag.count}</span>
          </button>
        );
      })}
    </div>
  );
}
