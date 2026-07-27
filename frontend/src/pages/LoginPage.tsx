import { useEffect, useState, type FormEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useLogin } from "../api/auth";
import { useAuthStore } from "../store/auth.store";
import { LoginInputSchema } from "../lib/schemas";

export function LoginPage() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const loginMutation = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 이미 로그인된 상태로 /login에 진입하면 바로 대시보드로 보낸다.
  useEffect(() => {
    if (accessToken) navigate("/", { replace: true });
  }, [accessToken, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = LoginInputSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력값을 확인하세요.");
      return;
    }
    setError(null);
    try {
      await loginMutation.mutateAsync(parsed.data);
      navigate("/");
    } catch {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
  }

  /**
   * 포트폴리오 시연용 데모 로그인. 회원가입 없이 미리 채워둔 샘플 데이터를 바로 볼 수 있도록
   * email/password 입력을 admin/admin으로 채우고 즉시 로그인까지 수행한다.
   * 인증 절차 자체는 일반 로그인과 동일(백엔드가 비밀번호를 정상 검증)하며, 프론트에서 우회하지 않는다.
   */
  async function handleDemoLogin() {
    setEmail("admin");
    setPassword("admin");
    setError(null);
    try {
      await loginMutation.mutateAsync({ email: "admin", password: "admin" });
      navigate("/");
    } catch {
      setError("데모 계정 로그인에 실패했습니다.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-text">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-border bg-surface p-6"
      >
        <h1 className="mb-6 font-mono text-lg font-semibold">
          link<span className="text-accent">stash</span>
        </h1>

        <label className="mb-1 block font-mono text-xs text-muted">
          이메일
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          className="mb-4 w-full border border-border bg-bg px-3 py-2 font-mono text-sm text-text focus:border-accent focus:outline-none"
        />

        <label className="mb-1 block font-mono text-xs text-muted">
          비밀번호
        </label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          className="mb-4 w-full border border-border bg-bg px-3 py-2 font-mono text-sm text-text focus:border-accent focus:outline-none"
        />

        {error && <p className="mb-3 font-mono text-xs text-danger">{error}</p>}

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded border border-accent bg-accent-soft px-3 py-2 font-mono text-sm text-accent transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loginMutation.isPending ? "로그인 중..." : "로그인"}
        </button>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] text-muted">또는</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loginMutation.isPending}
          className="w-full rounded border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
        >
          회원가입 없이 데모로 둘러보기
        </button>

        <p className="mt-4 text-center font-mono text-xs text-muted">
          계정이 없으신가요?{" "}
          <RouterLink to="/register" className="text-accent hover:underline">
            회원가입
          </RouterLink>
        </p>
      </form>
    </div>
  );
}
