import { Button, Card, Input, PageShell, StatusBadge, Table, Td, Th } from '@tour/ui';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCafeLeads, type CafeLeadRow } from '../features/outreach/hooks';

const STATUS_OPTIONS: Array<CafeLeadRow['status']> = ['DISCOVERED', 'FETCHED', 'PARSED', 'DRAFTED', 'APPROVED', 'SENT', 'SKIPPED', 'FAILED'];

function statusTone(status: CafeLeadRow['status']): 'auto' | 'override' | 'success' | 'warning' {
  if (status === 'SENT' || status === 'APPROVED') {
    return 'success';
  }
  if (status === 'FAILED' || status === 'SKIPPED') {
    return 'warning';
  }
  if (status === 'PARSED' || status === 'DRAFTED') {
    return 'override';
  }
  return 'auto';
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('ko-KR');
}

export function OutreachLeadListPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [hasEmailOnly, setHasEmailOnly] = useState(false);
  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      statuses: status ? [status] : undefined,
      hasEmail: hasEmailOnly ? true : undefined,
    }),
    [hasEmailOnly, search, status],
  );
  const { leads, loading, refetch } = useCafeLeads(filters);

  return (
    <PageShell className="grid gap-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">카페 리드</h1>
          <p className="mt-1 text-sm text-slate-600">카페에서 수집된 견적 문의를 검토하고 메일 발송 전에 승인합니다.</p>
        </div>
        <Button variant="outline" onClick={() => void refetch()}>
          새로고침
        </Button>
      </header>

      <Card className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1.5fr_0.7fr_auto_auto]">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="제목, 작성자, articleId 검색" />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">전체 상태</option>
          {STATUS_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={hasEmailOnly} onChange={(event) => setHasEmailOnly(event.target.checked)} />
          이메일 있는 리드만
        </label>
        <Button variant="primary" onClick={() => void refetch()}>
          조회
        </Button>
      </Card>

      <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <thead>
            <tr>
              <Th>articleId</Th>
              <Th>제목</Th>
              <Th>작성자</Th>
              <Th>게시시각</Th>
              <Th>점수</Th>
              <Th>상태</Th>
              <Th>액션</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <Td colSpan={7}>불러오는 중...</Td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <Td colSpan={7}>리드가 없습니다.</Td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id}>
                  <Td>{lead.articleId}</Td>
                  <Td>
                    <div className="grid gap-1">
                      <span className="font-medium text-slate-900">{lead.title}</span>
                      <span className="text-xs text-slate-500">{lead.contactEmail ?? '이메일 미확인'}</span>
                    </div>
                  </Td>
                  <Td>{lead.authorNickname ?? '-'}</Td>
                  <Td>{formatDate(lead.postedAt ?? lead.postedAtRaw)}</Td>
                  <Td>{lead.leadScore ?? '-'}</Td>
                  <Td>
                    <StatusBadge tone={statusTone(lead.status)} label={lead.status} />
                  </Td>
                  <Td>
                    <Link to={`/outreach/leads/${lead.id}`} className="text-sm font-medium text-blue-700 hover:text-blue-800">
                      상세 보기
                    </Link>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </PageShell>
  );
}
