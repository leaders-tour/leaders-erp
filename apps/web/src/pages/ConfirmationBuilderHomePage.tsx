import { ApolloError } from '@apollo/client';
import { Card } from '@tour/ui';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ConfirmationListPanel } from '../features/confirmation/components/ConfirmationListPanel';
import { ConfirmationLatestPreviewPanel } from '../features/confirmation/components/ConfirmationLatestPreviewPanel';
import {
  useConfirmationDocumentsByUserId,
  useDeleteConfirmationDocument,
  useSaveConfirmationDocumentMemo,
} from '../features/confirmation/hooks/use-confirmation-document';
import type { ConfirmationDocumentRow } from '../features/confirmation/model/types';
import {
  buildConfirmationBuilderPath,
  buildConfirmationBuilderPathFromDocument,
} from '../features/confirmation/utils/confirmation-builder-source';
import {
  resolvePreviewConfirmationDocument,
  selectLatestConfirmationDocument,
} from '../features/confirmation/utils/select-latest-confirmation-document';
import '../features/confirmation/styles/confirmation-builder-page.css';
import { CustomerSelector } from '../features/plan/components';
import { matchesCustomerSearchKeyword } from '../features/plan/customerSearch';
import { getCustomerTripStatus } from '../features/plan/customerTripStatus';
import { dateKey } from '../features/plan/deal-pipeline-stage';
import { useUsers } from '../features/plan/hooks';
import {
  getQueryParam,
  patchSearchParams,
  setOptionalQueryParam,
  setQueryParam,
} from '../lib/list-filters';

export function ConfirmationBuilderHomePage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { users, loading: usersLoading } = useUsers();
  const selectedUserId = searchParams.get('userId') ?? '';
  const previewDocumentId = searchParams.get('previewDocumentId') ?? '';
  const customerSearch = getQueryParam(searchParams, 'q');
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [savingMemoDocumentId, setSavingMemoDocumentId] = useState<string | null>(null);

  function setCustomerSearch(value: string) {
    patchSearchParams(setSearchParams, (prev) => setQueryParam(prev, 'q', value));
  }

  function setSelectedUserId(userId: string) {
    patchSearchParams(setSearchParams, (prev) => {
      setOptionalQueryParam(prev, 'userId', userId || undefined);
      prev.delete('previewDocumentId');
    });
  }

  function setPreviewDocumentId(documentId: string | undefined) {
    patchSearchParams(setSearchParams, (prev) =>
      setOptionalQueryParam(prev, 'previewDocumentId', documentId),
    );
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (getCustomerTripStatus(user) !== 'confirmed') return false;
      return matchesCustomerSearchKeyword(user, customerSearch);
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
  const latestDocument = useMemo(
    () => selectLatestConfirmationDocument(documents),
    [documents],
  );
  const previewDocument = useMemo(
    () => resolvePreviewConfirmationDocument(documents, previewDocumentId),
    [documents, previewDocumentId],
  );
  const isPreviewingLatest = previewDocument?.id === latestDocument?.id;
  const { deleteDocument, loading: deleteDocumentLoading } = useDeleteConfirmationDocument();
  const { saveMemo, loading: memoSaving } = useSaveConfirmationDocumentMemo({
    userId: selectedUserId || undefined,
  });

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

  const handleCreateFromFresh = () => {
    if (!primaryActiveTripId) {
      return;
    }
    navigate(buildConfirmationBuilderPath(primaryActiveTripId, 'fresh'));
  };

  const handleCreateFromDocument = (document: ConfirmationDocumentRow) => {
    navigate(buildConfirmationBuilderPathFromDocument(document));
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

  const handleSaveMemo = async (documentId: string, content: string) => {
    setSavingMemoDocumentId(documentId);
    try {
      await saveMemo(documentId, content);
    } catch (error) {
      const message =
        error instanceof ApolloError
          ? error.graphQLErrors[0]?.message?.trim()
          : error instanceof Error
            ? error.message
            : null;
      throw new Error(message && message.length > 0 ? message : '메모 저장에 실패했습니다.');
    } finally {
      setSavingMemoDocumentId((current) => (current === documentId ? null : current));
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
      if (previewDocumentId === document.id) {
        setPreviewDocumentId(undefined);
      }
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,3.5fr)_minmax(0,3.5fr)]">
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
            <ConfirmationListPanel
              documents={documents}
              loading={documentsLoading}
              selectedDocumentId={previewDocument?.id ?? null}
              onSelectDocument={(document) => setPreviewDocumentId(document.id)}
              onOpenDocument={handleOpenDocument}
              onDeleteDocument={(document) => void handleDeleteDocument(document)}
              onCreateFromDocument={handleCreateFromDocument}
              onCreateFromFresh={handleCreateFromFresh}
              canCreate={!!primaryActiveTripId}
              deleteLoading={deleteDocumentLoading}
              deletingDocumentId={deletingDocumentId}
              onSaveMemo={handleSaveMemo}
              memoSaving={memoSaving}
              savingMemoDocumentId={savingMemoDocumentId}
            />
          ) : (
            <Card className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              고객을 선택하면 확정서 목록이 표시됩니다.
            </Card>
          )}
        </div>

        <aside className="confirmation-builder-home-preview-column bg-slate-100/80 px-1 py-2 sm:px-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto lg:rounded-[28px] lg:border lg:border-slate-200 lg:px-3 lg:py-4">
          <ConfirmationLatestPreviewPanel
            document={previewDocument}
            documentsLoading={documentsLoading}
            hasSelectedCustomer={!!selectedUser}
            isLatest={isPreviewingLatest}
            onShowLatest={() => setPreviewDocumentId(undefined)}
          />
        </aside>
      </div>
    </section>
  );
}
