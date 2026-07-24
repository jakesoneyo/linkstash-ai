interface UserBadgeProps {
  email?: string;
  onLogout: () => void;
}

/** 상단바 우측 유저 칩(`@username`) + 로그아웃. */
export function UserBadge({ email, onLogout }: UserBadgeProps) {
  const username = email?.split("@")[0] ?? "guest";
  return (
    <div className="flex items-center gap-2 font-mono text-xs text-muted">
      <span>@{username}</span>
      <button
        type="button"
        onClick={onLogout}
        className="rounded border border-border px-2 py-1 text-text transition-colors hover:border-danger hover:text-danger"
      >
        로그아웃
      </button>
    </div>
  );
}
