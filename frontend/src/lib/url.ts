/** 카드 상단 메타 표시용 — 파싱 실패 시(비정상 URL 저장 등) 원본 문자열로 안전하게 폴백. */
export function safeDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
