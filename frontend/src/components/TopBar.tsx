import { useAuthStore } from "../store/auth.store";
import { QuickAddInput } from "./QuickAddInput";
import { UserBadge } from "./UserBadge";

interface TopBarProps {
  onQuickAdd: (url: string) => void;
  quickAddPending?: boolean;
}

/** 워드마크 + QuickAddInput + UserBadge (DESIGN.md TopBar). 768px 미만에서 줄바꿈. */
export function TopBar({ onQuickAdd, quickAddPending }: TopBarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3 md:px-6">
      <div className="font-mono text-lg font-semibold">
        link<span className="text-accent">stash</span>
      </div>
      <div className="order-3 w-full md:order-2 md:w-auto md:flex-1">
        <QuickAddInput onSubmit={onQuickAdd} pending={quickAddPending} />
      </div>
      <div className="order-2 ml-auto md:order-3">
        <UserBadge email={user?.email} onLogout={logout} />
      </div>
    </header>
  );
}
