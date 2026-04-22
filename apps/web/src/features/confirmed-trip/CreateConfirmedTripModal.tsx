import { useState, useEffect, useRef } from 'react';
import { useCreateUser, useUsers } from '../plan/hooks';

interface CreateConfirmedTripModalProps {
  open: boolean;
  saving: boolean;
  onSave: (payload: {
    userId: string;
    travelStart?: string | null;
    travelEnd?: string | null;
    destination?: string | null;
    paxCount?: number | null;
    totalAmountKrw?: number | null;
    depositAmountKrw?: number | null;
    balanceAmountKrw?: number | null;
    securityDepositAmountKrw?: number | null;
  }) => void;
  onClose: () => void;
}

function parseIntOrNull(val: string): number | null {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : null;
}

export function CreateConfirmedTripModal({
  open,
  saving,
  onSave,
  onClose,
}: CreateConfirmedTripModalProps): JSX.Element | null {
  const { users, refetch: refetchUsers } = useUsers();
  const { createUser, loading: creatingUser } = useCreateUser();

  // 고객 선택
  const [userId, setUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // 인라인 고객 생성
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  // 여행 정보
  const [travelStart, setTravelStart] = useState('');
  const [travelEnd, setTravelEnd] = useState('');
  const [destination, setDestination] = useState('');
  const [paxCount, setPaxCount] = useState('');

  // 금액
  const [totalAmountKrw, setTotalAmountKrw] = useState('');
  const [depositAmountKrw, setDepositAmountKrw] = useState('');
  const [balanceAmountKrw, setBalanceAmountKrw] = useState('');
  const [securityDepositAmountKrw, setSecurityDepositAmountKrw] = useState('');
  // 잔금을 사용자가 직접 수정했는지 추적
  const balanceManualRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setUserId('');
    setUserSearch('');
    setShowCreateUser(false);
    setNewUserName('');
    setNewUserEmail('');
    setTravelStart('');
    setTravelEnd('');
    setDestination('');
    setPaxCount('');
    setTotalAmountKrw('');
    setDepositAmountKrw('');
    setBalanceAmountKrw('');
    setSecurityDepositAmountKrw('');
    balanceManualRef.current = false;
  }, [open]);

  // 총액 또는 계약금이 바뀌면 잔금 자동 계산 (수동 수정 이전까지만)
  useEffect(() => {
    if (balanceManualRef.current) return;
    const total = parseIntOrNull(totalAmountKrw);
    const deposit = parseIntOrNull(depositAmountKrw);
    if (total !== null && deposit !== null) {
      setBalanceAmountKrw(String(Math.max(0, total - deposit)));
    } else {
      setBalanceAmountKrw('');
    }
  }, [totalAmountKrw, depositAmountKrw]);

  if (!open) return null;

  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q);
  });

  const selectedUser = users.find((u) => u.id === userId) ?? null;

  async function handleCreateNewUser() {
    if (!newUserName.trim()) return;
    const created = await createUser({
      name: newUserName.trim(),
      email: newUserEmail.trim() || null,
    });
    await refetchUsers();
    setUserId(created.id);
    setShowCreateUser(false);
    setNewUserName('');
    setNewUserEmail('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    onSave({
      userId,
      travelStart: travelStart || null,
      travelEnd: travelEnd || null,
      destination: destination.trim() || null,
      paxCount: parseIntOrNull(paxCount),
      totalAmountKrw: parseIntOrNull(totalAmountKrw),
      depositAmountKrw: parseIntOrNull(depositAmountKrw),
      balanceAmountKrw: parseIntOrNull(balanceAmountKrw),
      securityDepositAmountKrw: parseIntOrNull(securityDepositAmountKrw),
    });
  }

  const inputCls =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none';
  const labelCls = 'mb-1 block text-xs font-medium text-slate-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">확정 여행 직접 추가</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="닫기"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid max-h-[80vh] gap-4 overflow-y-auto p-5">
          {/* ── 고객 선택 ── */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className={labelCls}>
                고객 <span className="text-red-500">*</span>
              </label>
              {!selectedUser && !showCreateUser && (
                <button
                  type="button"
                  onClick={() => setShowCreateUser(true)}
                  className="text-xs font-medium text-emerald-600 hover:underline"
                >
                  + 새 고객 생성
                </button>
              )}
            </div>

            {/* 인라인 고객 생성 폼 */}
            {showCreateUser && (
              <div className="mb-2 grid gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-medium text-emerald-800">새 고객 생성</p>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="고객 이름 *"
                  className={inputCls}
                  autoFocus
                />
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="이메일 (선택)"
                  className={inputCls}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateNewUser}
                    disabled={!newUserName.trim() || creatingUser}
                    className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {creatingUser ? '생성 중...' : '생성하고 선택'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreateUser(false); setNewUserName(''); setNewUserEmail(''); }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 선택된 고객 표시 */}
            {selectedUser ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div>
                  <span className="text-sm font-medium text-slate-900">{selectedUser.name}</span>
                  {selectedUser.email && (
                    <span className="ml-2 text-xs text-slate-400">{selectedUser.email}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setUserId(''); setUserSearch(''); }}
                  className="ml-2 shrink-0 rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                >
                  변경
                </button>
              </div>
            ) : !showCreateUser && (
              <>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="이름 또는 이메일로 검색..."
                  className={inputCls}
                />
                <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                  {filteredUsers.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-400">검색 결과 없음</p>
                  ) : (
                    filteredUsers.slice(0, 50).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setUserId(u.id); setUserSearch(''); }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50"
                      >
                        <span className="font-medium text-slate-900">{u.name}</span>
                        {u.email && <span className="ml-2 text-slate-400">{u.email}</span>}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── 여행 기간 ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>여행 시작일</label>
              <input
                type="date"
                value={travelStart}
                onChange={(e) => setTravelStart(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>여행 종료일</label>
              <input
                type="date"
                value={travelEnd}
                onChange={(e) => setTravelEnd(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* ── 목적지 & 인원 ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>목적지</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="예: 고비사막"
                maxLength={200}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>인원 (명)</label>
              <input
                type="number"
                min={1}
                max={9999}
                value={paxCount}
                onChange={(e) => setPaxCount(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
          </div>

          {/* ── 금액 ── */}
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">금액</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>총액 (원)</label>
                <input
                  type="number"
                  min={0}
                  value={totalAmountKrw}
                  onChange={(e) => {
                    setTotalAmountKrw(e.target.value);
                    balanceManualRef.current = false;
                  }}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>계약금 (원)</label>
                <input
                  type="number"
                  min={0}
                  value={depositAmountKrw}
                  onChange={(e) => {
                    setDepositAmountKrw(e.target.value);
                    balanceManualRef.current = false;
                  }}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  잔금 (원)
                  <span className="ml-1 text-slate-400 font-normal">자동계산</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={balanceAmountKrw}
                  onChange={(e) => {
                    balanceManualRef.current = true;
                    setBalanceAmountKrw(e.target.value);
                  }}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>보증금 (원)</label>
                <input
                  type="number"
                  min={0}
                  value={securityDepositAmountKrw}
                  onChange={(e) => setSecurityDepositAmountKrw(e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* ── 버튼 ── */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving || !userId}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '확정 여행 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
