import { useEffect, useState } from "react";

/** 값 변경 후 delayMs 동안 추가 변경이 없을 때만 반영 — 검색창 타이핑마다 API 호출되는 것을 막는다. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
