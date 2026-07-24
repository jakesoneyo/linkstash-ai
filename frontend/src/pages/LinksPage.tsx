import { useState } from "react";
import { useCreateLink, useLinks, useReprocessLink } from "../api/links";
import { useTags } from "../api/tags";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { TopBar } from "../components/TopBar";
import { SearchBar } from "../components/SearchBar";
import { TagFilterBar } from "../components/TagFilterBar";
import { LinkGrid } from "../components/LinkGrid";

/** 메인 대시보드 — quick-add 저장, 태그 필터/검색, 카드 그리드(자동 상태 폴링 포함). */
export function LinksPage() {
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const debouncedSearch = useDebouncedValue(search);

  const linksQuery = useLinks({ q: debouncedSearch, tags: selectedTags });
  const tagsQuery = useTags();
  const createLink = useCreateLink();
  const reprocessLink = useReprocessLink();

  function handleQuickAdd(url: string) {
    createLink.mutate({ url });
  }

  function handleToggleTag(name: string) {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  }

  function handleRetry(id: string) {
    reprocessLink.mutate(id);
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <TopBar
        onQuickAdd={handleQuickAdd}
        quickAddPending={createLink.isPending}
      />

      <div className="border-b border-border bg-surface px-4 py-3 md:px-6">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      <TagFilterBar
        tags={tagsQuery.data ?? []}
        selected={selectedTags}
        onToggle={handleToggleTag}
      />

      <main className="px-4 py-4 md:px-6">
        {linksQuery.isLoading && (
          <p className="font-mono text-sm text-muted">불러오는 중...</p>
        )}
        {linksQuery.isError && (
          <p className="font-mono text-sm text-danger">
            링크를 불러오지 못했습니다.
          </p>
        )}
        {linksQuery.data && linksQuery.data.items.length === 0 && (
          <p className="font-mono text-sm text-muted">
            저장된 링크가 없습니다 — 위 quick-add에 URL을 붙여넣어 보세요.
          </p>
        )}
        {linksQuery.data && linksQuery.data.items.length > 0 && (
          <LinkGrid links={linksQuery.data.items} onRetry={handleRetry} />
        )}
      </main>
    </div>
  );
}
