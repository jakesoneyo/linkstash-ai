import { useState, type FormEvent } from "react";
import { CreateLinkInputSchema } from "../lib/schemas";

interface QuickAddInputProps {
  onSubmit: (url: string) => void;
  pending?: boolean;
}

/** 상단바 URL 빠른 저장 입력 — `> paste_url --save` 프롬프트 스타일(DESIGN.md). */
export function QuickAddInput({ onSubmit, pending }: QuickAddInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = CreateLinkInputSchema.safeParse({ url: value.trim() });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "올바른 URL을 입력하세요.");
      return;
    }
    setError(null);
    onSubmit(result.data.url);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
      <div className="flex flex-1 items-center gap-2 border border-border bg-bg px-3 py-1.5 font-mono text-sm">
        <span className="text-accent">&gt;</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="링크 URL을 붙여넣으세요"
          className="w-full min-w-40 bg-transparent text-text placeholder:text-muted focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-border px-3 py-1.5 font-mono text-sm text-text transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {pending ? "저장 중..." : "저장"}
      </button>
      {error && <span className="font-mono text-xs text-danger">{error}</span>}
    </form>
  );
}
