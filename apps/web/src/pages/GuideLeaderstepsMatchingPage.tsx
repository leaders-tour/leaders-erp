import { Button, Card, Input } from '@tour/ui';
import { useMemo, useState } from 'react';
import {
  useGuideLeaderstepsAuthLink,
  useGuides,
  useLeaderstepsAuthUsers,
} from '../features/guide/hooks';

function normalizeSearchText(value: string | null | undefined): string {
  return value?.trim().toLocaleLowerCase() ?? '';
}

function formatAuthUserLabel({
  email,
  displayName,
  phone,
}: {
  email: string | null;
  displayName: string | null;
  phone: string | null;
}): string {
  const identity = email ?? phone ?? '이메일 없음';
  return displayName ? `${displayName} · ${identity}` : identity;
}

export function GuideLeaderstepsMatchingPage(): JSX.Element {
  const { guides, loading: guidesLoading } = useGuides();
  const {
    authUsers,
    loading: authUsersLoading,
    errorMessage: authUsersError,
  } = useLeaderstepsAuthUsers();
  const { link, unlink, loading: mutationLoading } = useGuideLeaderstepsAuthLink();
  const [guideSearch, setGuideSearch] = useState('');
  const [authSearch, setAuthSearch] = useState('');
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [selectedAuthUserId, setSelectedAuthUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const normalizedGuideSearch = normalizeSearchText(guideSearch);
  const normalizedAuthSearch = normalizeSearchText(authSearch);
  const allLinkedGuides = useMemo(
    () => guides.filter((guide) => guide.leaderstepsAuthUserId),
    [guides],
  );
  const allUnlinkedGuides = useMemo(
    () => guides.filter((guide) => !guide.leaderstepsAuthUserId),
    [guides],
  );
  const allAvailableAuthUsers = useMemo(
    () => authUsers.filter((authUser) => !authUser.linkedGuideId),
    [authUsers],
  );
  const filteredLinkedGuides = useMemo(
    () =>
      allLinkedGuides.filter((guide) => {
        if (!guide.leaderstepsAuthUserId) return false;
        if (!normalizedGuideSearch) return true;
        const authUser = authUsers.find((candidate) => candidate.id === guide.leaderstepsAuthUserId);
        return [
          guide.nameKo,
          guide.nameMn,
          guide.phone,
          authUser?.email,
          authUser?.displayName,
        ].some((value) => normalizeSearchText(value).includes(normalizedGuideSearch));
      }),
    [allLinkedGuides, authUsers, normalizedGuideSearch],
  );
  const filteredUnlinkedGuides = useMemo(
    () =>
      allUnlinkedGuides.filter(
        (guide) =>
          (!normalizedGuideSearch ||
            [guide.nameKo, guide.nameMn, guide.phone].some((value) =>
              normalizeSearchText(value).includes(normalizedGuideSearch),
            )),
      ),
    [allUnlinkedGuides, normalizedGuideSearch],
  );
  const filteredAvailableAuthUsers = useMemo(
    () =>
      allAvailableAuthUsers.filter(
        (authUser) =>
          (!normalizedAuthSearch ||
            [authUser.email, authUser.displayName, authUser.phone].some((value) =>
              normalizeSearchText(value).includes(normalizedAuthSearch),
            )),
      ),
    [allAvailableAuthUsers, normalizedAuthSearch],
  );
  const authUserById = useMemo(
    () => new Map(authUsers.map((authUser) => [authUser.id, authUser])),
    [authUsers],
  );
  const selectedGuide =
    allUnlinkedGuides.find((guide) => guide.id === selectedGuideId) ?? null;
  const selectedAuthUser =
    allAvailableAuthUsers.find((authUser) => authUser.id === selectedAuthUserId) ?? null;

  const handleSelectGuide = (guideId: string) => {
    setSelectedGuideId(guideId);
    setSelectedAuthUserId(null);
    setFeedback(null);
    setErrorMessage(null);
  };

  const handleLink = async () => {
    if (!selectedGuide || !selectedAuthUser) {
      setErrorMessage('가이드와 Leadersteps 계정을 순서대로 선택해 주세요.');
      return;
    }
    setFeedback(null);
    setErrorMessage(null);
    try {
      await link(selectedGuide.id, selectedAuthUser.id);
      setSelectedGuideId(null);
      setSelectedAuthUserId(null);
      setFeedback('가이드와 Leadersteps 계정을 연결했습니다.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '계정 연결에 실패했습니다.');
    }
  };

  const handleUnlink = async (guideId: string, guideName: string) => {
    if (!window.confirm(`${guideName} 가이드의 Leadersteps 계정 연결을 해제할까요?`)) {
      return;
    }
    setFeedback(null);
    setErrorMessage(null);
    try {
      await unlink(guideId);
      setFeedback('Leadersteps 계정 연결을 해제했습니다.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '연결 해제에 실패했습니다.');
    }
  };

  const loading = guidesLoading || authUsersLoading;

  return (
    <section className="grid gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            가이드 Leadersteps 계정 매칭
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            MySQL 가이드와 Leadersteps Supabase Auth 계정을 1:1로 연결합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
            연결 {allLinkedGuides.length}명
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
            미연결 가이드 {allUnlinkedGuides.length}명
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
            사용 가능 계정 {allAvailableAuthUsers.length}개
          </span>
        </div>
      </header>

      {authUsersError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {authUsersError}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}
      {feedback ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedback}
        </div>
      ) : null}

      {loading ? <p className="text-sm text-slate-500">가이드와 계정 목록을 불러오는 중...</p> : null}

      {!loading ? (
        <>
          <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid xl:grid-cols-2">
              <section className="border-b border-slate-200 p-5 xl:border-b-0 xl:border-r">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    1
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-900">미연결 가이드 선택</h2>
                    <p className="text-xs text-slate-500">연결할 가이드를 먼저 클릭하세요.</p>
                  </div>
                </div>
                <Input
                  id="guide-search"
                  className="mt-4"
                  value={guideSearch}
                  onChange={(event) => setGuideSearch(event.target.value)}
                  placeholder="가이드 이름 또는 전화번호"
                  aria-label="미연결 가이드 검색"
                />
                <div className="mt-4 grid max-h-[32rem] gap-2 overflow-y-auto pr-1">
                  {filteredUnlinkedGuides.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      표시할 미연결 가이드가 없습니다.
                    </p>
                  ) : (
                    filteredUnlinkedGuides.map((guide) => {
                      const selected = guide.id === selectedGuideId;
                      return (
                        <button
                          key={guide.id}
                          type="button"
                          aria-pressed={selected}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                            selected
                              ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                              : 'border-slate-200 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50'
                          }`}
                          onClick={() => handleSelectGuide(guide.id)}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {guide.nameKo}
                              {guide.nameMn ? ` · ${guide.nameMn}` : ''}
                            </span>
                            <span
                              className={`mt-1 block text-xs ${
                                selected ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              {guide.phone ?? '전화번호 없음'}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm">{selected ? '선택됨' : '선택'}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="p-5">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      selectedGuide ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    2
                  </span>
                  <div>
                    <h2 className="font-semibold text-slate-900">Leadersteps 계정 선택</h2>
                    <p className="text-xs text-slate-500">
                      {selectedGuide
                        ? `${selectedGuide.nameKo} 가이드에 연결할 계정을 클릭하세요.`
                        : '1단계에서 가이드를 선택하면 계정 목록이 열립니다.'}
                    </p>
                  </div>
                </div>

                {selectedGuide ? (
                  <>
                    <Input
                      id="leadersteps-auth-search"
                      className="mt-4"
                      value={authSearch}
                      onChange={(event) => setAuthSearch(event.target.value)}
                      placeholder="이메일, 이름 또는 전화번호"
                      aria-label="Leadersteps 계정 검색"
                    />
                    <div className="mt-4 grid max-h-[32rem] gap-2 overflow-y-auto pr-1">
                      {filteredAvailableAuthUsers.length === 0 ? (
                        <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                          검색 조건에 맞는 사용 가능한 계정이 없습니다.
                        </p>
                      ) : (
                        filteredAvailableAuthUsers.map((authUser) => {
                          const selected = authUser.id === selectedAuthUserId;
                          return (
                            <button
                              key={authUser.id}
                              type="button"
                              aria-pressed={selected}
                              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                selected
                                  ? 'border-indigo-600 bg-indigo-50 shadow-sm ring-1 ring-indigo-600'
                                  : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'
                              }`}
                              onClick={() => {
                                setSelectedAuthUserId(authUser.id);
                                setFeedback(null);
                                setErrorMessage(null);
                              }}
                            >
                              <span className="block font-semibold text-slate-900">
                                {authUser.email ?? authUser.phone ?? '이메일 없음'}
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">
                                {authUser.displayName ?? '표시 이름 없음'}
                                {authUser.phone ? ` · ${authUser.phone}` : ''}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-4 flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-500">
                    왼쪽에서 미연결 가이드를 선택해 주세요.
                  </div>
                )}
              </section>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm">
                {selectedGuide ? (
                  <p className="font-medium text-slate-900">
                    {selectedGuide.nameKo}
                    <span className="mx-2 text-slate-400">→</span>
                    {selectedAuthUser
                      ? formatAuthUserLabel(selectedAuthUser)
                      : '연결할 계정을 선택해 주세요'}
                  </p>
                ) : (
                  <p className="text-slate-500">가이드와 계정을 순서대로 선택해 주세요.</p>
                )}
              </div>
              <Button
                type="button"
                disabled={mutationLoading || !selectedGuide || !selectedAuthUser}
                onClick={() => void handleLink()}
              >
                {mutationLoading ? '처리 중...' : '선택한 계정 연결'}
              </Button>
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">연결된 계정</h2>
            <p className="mt-1 text-xs text-slate-500">
              연결된 Auth 계정은 다른 가이드가 선택할 수 없습니다.
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {filteredLinkedGuides.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500 lg:col-span-2">
                  연결된 가이드가 없습니다.
                </p>
              ) : (
                filteredLinkedGuides.map((guide) => {
                  const authUser = guide.leaderstepsAuthUserId
                    ? authUserById.get(guide.leaderstepsAuthUserId)
                    : undefined;
                  return (
                    <div
                      key={guide.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {guide.nameKo}
                          {guide.nameMn ? ` · ${guide.nameMn}` : ''}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-600">
                          {authUser
                            ? formatAuthUserLabel(authUser)
                            : guide.leaderstepsAuthUserId}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={mutationLoading}
                        onClick={() => void handleUnlink(guide.id, guide.nameKo)}
                      >
                        연결 해제
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </>
      ) : null}
    </section>
  );
}
