import { SearchIcon } from "./icons";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

/** 제목/요약 텍스트 검색 입력 — 실제 API 호출은 상위에서 debounce된 값으로 트리거된다. */
export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 border border-border bg-bg px-3 py-1.5 font-mono text-sm">
      <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="제목·요약으로 검색"
        className="w-full bg-transparent text-text placeholder:text-muted focus:outline-none"
      />
    </div>
  );
}
