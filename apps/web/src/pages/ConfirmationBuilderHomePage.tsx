import { ApolloError } from '@apollo/client';
import { Button, Card } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmationListPanel } from '../features/confirmation/components/ConfirmationListPanel';
import {
  useConfirmationDocumentsByUserId,
  useDeleteConfirmationDocument,
} from '../features/confirmation/hooks/use-confirmation-document';
import type { ConfirmationDocumentRow } from '../features/confirmation/model/types';
import { CustomerSelector } from '../features/plan/components';
import { getCustomerTripStatus } from '../features/plan/customerTripStatus';
import { dateKey } from '../features/plan/deal-pipeline-stage';
import { useUsers } from '../features/plan/hooks';

const DEAL_STAGE_LABELS = {
  CONSULTING: '컨설팅',
  CONTRACTING: '계약단계',
  CONTRACT_CONFIRMED: '계약확정',
  MONGOL_ASSIGNING: '몽골배정단계',
  MONGOL_ASSIGNED: '몽골배정완료',
  ON_HOLD: '대기중',
  BEFORE_DEPARTURE_10D: '출발 10일이내',
  BEFORE_DEPARTURE_3D: '출발 3일이내',
  TRIP_COMPLETED: '여행 완료시',
} as const;

export function ConfirmationBuilderHomePage(): JSX.Element {
  const navigate = useNavigate();
  const { users, loading: usersLoading } = useUsers();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const filteredUsers = useMemo(() => {
    const keyword = customerSearch.trim().toLowerCase();
    return users.filter((user) => {
      if (getCustomerTripStatus(user) !== 'confirmed') return false;
      if (!keyword) return true;
      const ownerNameMatched = user.ownerEmployee?.name.toLowerCase().includes(keyword) ?? false;
      const ownerEmailMatched = user.ownerEmployee?.email.toLowerCase().includes(keyword) ?? false;
      return user.name.toLowerCase().includes(keyword) || ownerNameMatched || ownerEmailMatched;
    });
  }, [customerSearch, users]);

  useEffect(() => {
    if (!selectedUserId && filteredUsers.length > 0) {
      setSelectedUserId(filteredUsers[0]?.id ?? '');
      return;
    }
    if (selectedUserId && !filteredUsers.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(filteredUsers[0]?.id ?? '');
    }
  }, [filteredUsers, selectedUserId]);

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const { documents, loading: documentsLoading } = useConfirmationDocumentsByUserId(selectedUserId || undefined);
  const { deleteDocument, loading: deleteDocumentLoading } = useDeleteConfirmationDocument();
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const primaryActiveTripId = useMemo(() => {
    const activeTrips = (selectedUser?.confirmedTrips ?? [])
      .filter((trip) => trip.status === 'ACTIVE')
      .sort((left, right) => {
        const leftDate = dateKey(left.travelStart) ?? '';
        const rightDate = dateKey(right.travelStart) ?? '';
        return rightDate.localeCompare(leftDate);
      });
    return activeTrips[0]?.id ?? null;
  }, [selectedUser?.confirmedTrips]);

  const handleOpenDocument = (document: ConfirmationDocumentRow) => {
    navigate(`/confirmation-documents/${document.id}`);
  };

  const handleCreateDocument = () => {
    if (!primaryActiveTripId) {
      return;
    }
    navigate(`/confirmed-trips/${primaryActiveTripId}/confirmation-builder`);
  };

  const getDocumentTitle = (document: ConfirmationDocumentRow): string => {
    const destination = document.snapshot.destination?.trim();
    if (destination) {
      return `${destination} 여정`;
    }
    return '확정 여정';
  };

  const getStatusLabel = (status: ConfirmationDocumentRow['status']): string => {
    switch (status) {
      case 'DRAFT':
        return '임시저장';
      case 'PUBLISHED':
        return '발행';
      case 'ARCHIVED':
        return '보관됨';
      default:
        return status;
    }
  };

  const handleDeleteDocument = async (document: ConfirmationDocumentRow) => {
    if (!selectedUserId) {
      return;
    }
    if (
      !window.confirm(
        `${getDocumentTitle(document)} v${document.versionNumber} (${getStatusLabel(document.status)}) 확정서를 삭제할까요? 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }
    setDeletingDocumentId(document.id);
    try {
      await deleteDocument(document.id, selectedUserId);
    } catch (error) {
      const message =
        error instanceof ApolloError
          ? error.graphQLErrors[0]?.message?.trim()
          : error instanceof Error
            ? error.message
            : null;
      window.alert(message && message.length > 0 ? message : '확정서 삭제에 실패했습니다.');
    } finally {
      setDeletingDocumentId((current) => (current === document.id ? null : current));
    }
  };

  return (
    <section className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">확정서 빌더</h1>
        <p className="mt-1 text-sm text-slate-600">
          고객을 선택해 확정서를 만들거나 저장 이력을 확인합니다.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid gap-4">
          <CustomerSelector
            users={filteredUsers}
            selectedUserId={selectedUserId}
            searchValue={customerSearch}
            onChangeSearch={setCustomerSearch}
            onSelect={setSelectedUserId}
            hideStatusFilter
          />
        </div>

        <div className="flex min-h-0 flex-col gap-4 self-start">
          {usersLoading ? <div className="text-sm text-slate-600">불러오는 중...</div> : null}

          {selectedUser ? (
            <>
              <Card className="h-fit self-start rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className="text-xs font-medium text-slate-500">고객 정보</p>
                      <h2 className="text-base font-semibold text-slate-900">{selectedUser.name}</h2>
                      <p className="text-sm text-slate-600">
                        담당자: {selectedUser.ownerEmployee?.name ?? '미지정'}
                        {selectedUser.email ? ` · ${selectedUser.email}` : ''}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>진행 단계: {DEAL_STAGE_LABELS[selectedUser.dealStage]}</span>
                      <span>확정서 수: {documents.length}개</span>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => navigate(`/customers/${selectedUser.id}/plans`)}>
                    고객 정보 수정
                  </Button>
                </div>
              </Card>

              <ConfirmationListPanel
                documents={documents}
                loading={documentsLoading}
                onOpenDocument={handleOpenDocument}
                onDeleteDocument={(document) => void handleDeleteDocument(document)}
                onCreateDocument={handleCreateDocument}
                canCreate={!!primaryActiveTripId}
                deleteLoading={deleteDocumentLoading}
                deletingDocumentId={deletingDocumentId}
              />
            </>
          ) : (
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              고객을 선택하면 확정서 목록이 표시됩니다.
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
