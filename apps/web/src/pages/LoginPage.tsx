import { Button, Card, Input } from '@tour/ui';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context';

interface LoginLocationState {
  from?: string;
}

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectTo = (location.state as LoginLocationState | null)?.from || '/';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_45%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] px-4 py-10">
      <Card className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-xl shadow-slate-300/30 backdrop-blur">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">Leaders ERP</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">직원 로그인</h1>
          <p className="mt-2 text-sm text-slate-600">인증 후 ERP 전체 메뉴에 접근할 수 있습니다.</p>
        </div>

        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);
            setErrorMessage(null);

            try {
              await login(email.trim(), password);
              navigate(redirectTo, { replace: true });
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : '로그인에 실패했습니다.');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <label className="grid gap-1.5 text-sm text-slate-700">
            <span>이메일</span>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
            />
          </label>

          <label className="grid gap-1.5 text-sm text-slate-700">
            <span>비밀번호</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호 입력"
              autoComplete="current-password"
            />
          </label>

          {errorMessage ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}

          <Button type="submit" variant="primary" disabled={!email.trim() || !password || submitting} className="mt-2">
            {submitting ? '로그인 중...' : '로그인'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
