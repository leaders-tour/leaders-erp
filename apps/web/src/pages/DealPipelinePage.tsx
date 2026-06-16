import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, dealPipelineTokens } from '@tour/ui';
import { useEffect, useMemo, useRef, useState, type TransitionEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/context';
import {
  useContractDocumentReviewTabCounts,
  useContractDocumentStatuses,
  useContractPaymentReceipts,
  useContractPaymentReviewTabCounts,
  useContractPaymentStatuses,
  useContractPaymentSyncRuns,
  useContractSubmissions,
  useContractSyncRuns,
  type ContractDocumentStatusRow,
  type ContractPaymentReceiptRow,
  type ContractPaymentStatusRow,
  type ContractSubmissionRow,
} from '../features/contract/hooks';
import { EstimateDocument } from '../features/estimate/components/EstimateDocument';
import { EstimatePreviewScaler } from '../features/estimate/components/EstimatePreviewScaler';
import { useEstimateSource } from '../features/estimate/hooks/use-estimate-source';
import { ConfirmationDocument } from '../features/confirmation/components/ConfirmationDocument';
import { useLatestPublishedConfirmationDocument } from '../features/confirmation/hooks/use-confirmation-document';
import { snapshotToDocumentData } from '../features/confirmation/utils/format';
import {
  useCreateUserNote,
  useReorderDealPipeline,
  useUpdateUserDealTodoStatus,
  useUserDealTodos,
  useUserNotes,
  useUsers,
  type DealPipelineCardUpdateInput,
  type DealStageValue,
  type DealTodoStatusValue,
  type UserDealTodoRow,
  type UserNoteRow,
  type UserRow,
} from '../features/plan/hooks';
import {
  calculateTourDayNumber,
  getActiveConfirmedTrip,
  resolveTourOperationStages,
  resolveVisibleStage,
  type PipelineStageKey,
  type TourOperationStageKey,
  type VisibleDealStageKey,
} from '../features/plan/deal-pipeline-stage';
import { formatPickupDropDisplay } from '../features/plan/pickup-drop';

const MANUAL_STAGES: Array<{ key: VisibleDealStageKey; label: string }> = [
  { key: 'CONTRACTING', label: '계약단계' },
  { key: 'CONTRACT_CONFIRMED', label: '계약확정' },
  { key: 'MONGOL_ASSIGNING', label: '몽골배정단계' },
  { key: 'MONGOL_ASSIGNED', label: '몽골배정완료' },
];

const TOUR_STAGES: Array<{ key: TourOperationStageKey; label: string }> = [
  { key: 'TOUR_START', label: '투어 시작' },
  { key: 'TOUR_IN_PROGRESS', label: '투어 중' },
  { key: 'TOUR_END', label: '투어 종료' },
];

const STAGES: Array<{ key: PipelineStageKey; label: string }> = [...MANUAL_STAGES, ...TOUR_STAGES];

type BoardState = Record<PipelineStageKey, UserRow[]>;

const COLUMN_PREFIX = 'column:';

function columnId(stage: string): string {
  return `${COLUMN_PREFIX}${stage}`;
}

function isColumnId(id: string): boolean {
  return id.startsWith(COLUMN_PREFIX);
}

function isManualStageKey(stage: string): stage is VisibleDealStageKey {
  return MANUAL_STAGES.some((item) => item.key === stage);
}

function parseColumnId(id: string): VisibleDealStageKey | null {
  if (!isColumnId(id)) {
    return null;
  }

  const stage = id.slice(COLUMN_PREFIX.length) as VisibleDealStageKey;
  return MANUAL_STAGES.some((item) => item.key === stage) ? stage : null;
}

function createEmptyBoard(): BoardState {
  return STAGES.reduce((acc, stage) => {
    acc[stage.key] = [];
    return acc;
  }, {} as BoardState);
}

function sortUsersInStage(users: UserRow[]): UserRow[] {
  return users.slice().sort((left, right) => {
    if (left.dealStageOrder !== right.dealStageOrder) {
      return left.dealStageOrder - right.dealStageOrder;
    }
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);
    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
      return rightTime - leftTime;
    }
    return left.id.localeCompare(right.id);
  });
}

function buildBoard(users: UserRow[]): BoardState {
  const next = createEmptyBoard();

  for (const user of users) {
    if (!isManualStageKey(user.dealStage)) {
      continue;
    }
    next[user.dealStage].push(user);
  }

  for (const stage of STAGES) {
    next[stage.key] = sortUsersInStage(next[stage.key]).map((user, index) => ({
      ...user,
      dealStage: isManualStageKey(stage.key) ? stage.key : user.dealStage,
      dealStageOrder: index,
    }));
  }

  return next;
}

function normalizeBoard(board: BoardState): BoardState {
  const next = createEmptyBoard();

  for (const stage of STAGES) {
    next[stage.key] = board[stage.key].map((user, index) => ({
      ...user,
      dealStage: isManualStageKey(stage.key) ? stage.key : user.dealStage,
      dealStageOrder: index,
    }));
  }

  return next;
}

function flattenBoardToUpdates(board: BoardState): DealPipelineCardUpdateInput[] {
  const updates: DealPipelineCardUpdateInput[] = [];

  for (const stage of MANUAL_STAGES) {
    for (const user of board[stage.key]) {
      updates.push({
        userId: user.id,
        dealStage: stage.key,
        dealStageOrder: user.dealStageOrder,
      });
    }
  }

  return updates;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('ko-KR');
}

function formatOptionalDateTime(value: string | null | undefined): string {
  return value ? formatDateTime(value) : '-';
}

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

  if (diffInMinutes < 1) return '방금 전';
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}일 전`;

  return formatDateTimeParts(value).date;
}

function formatDateTimeParts(value: string): { date: string; time: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: '-', time: '' };
  }
  return {
    date: date.toLocaleDateString('ko-KR'),
    time: date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
  };
}

function stageLabel(stage: string): string {
  return STAGES.find((item) => item.key === stage)?.label ?? stage;
}

function todoStatusLabel(status: DealTodoStatusValue): string {
  if (status === 'TODO') {
    return 'TODO';
  }
  if (status === 'DOING') {
    return '진행중';
  }
  return '완료';
}

function getUserContractDocumentNumber(user: UserRow | null | undefined): string | null {
  return user?.plans?.find((plan) => plan.currentVersion?.meta?.documentNumber)?.currentVersion?.meta?.documentNumber ?? null;
}

function getUserCurrentPlanVersionId(user: UserRow | null | undefined): string | null {
  return user?.plans?.find((plan) => plan.currentVersion?.id)?.currentVersion?.id ?? null;
}

function normalizeContractDocumentNumberForLookup(value: string | null | undefined): string | null {
  const normalized = value
    ?.normalize('NFKC')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[‐‑‒–—―-]/g, '-')
    .toUpperCase();
  return normalized || null;
}

function contractStatusLabel(status: ContractDocumentStatusRow | null): string {
  if (!status) {
    return '계약서 미작성';
  }
  if (status.status === 'COMPLETED') {
    return '계약서 완료';
  }
  if (status.status === 'OVER_SUBMITTED') {
    return `계약서 초과 ${status.submittedCount}/${status.expectedCount ?? '?'}`;
  }
  if (status.status === 'NEEDS_REVIEW') {
    return '계약서 확인 필요';
  }
  if (status.submittedCount > 0 || status.expectedCount != null) {
    return `계약서 ${status.submittedCount}/${status.expectedCount ?? '?'}`;
  }
  return '계약서 미작성';
}

function getUserPlanMeta(user: UserRow): NonNullable<NonNullable<UserRow['plans']>[number]['currentVersion']>['meta'] | null {
  return user.plans?.find((plan) => plan.currentVersion?.meta)?.currentVersion?.meta ?? null;
}

function getUserPlanPricing(user: UserRow): NonNullable<NonNullable<UserRow['plans']>[number]['currentVersion']>['pricing'] | null {
  return user.plans?.find((plan) => plan.currentVersion?.pricing)?.currentVersion?.pricing ?? null;
}

function getUserHeadcount(user: UserRow, contractStatus: ContractDocumentStatusRow | null): number | null {
  return getUserPlanMeta(user)?.headcountTotal ?? contractStatus?.expectedCount ?? null;
}

function formatUserCardTitle(user: UserRow, contractStatus: ContractDocumentStatusRow | null): string {
  const headcount = getUserHeadcount(user, contractStatus);
  return `${user.name}${headcount ? ` ${headcount}명` : ''}`;
}

function getUserTravelStartDate(user: UserRow): string | null {
  const planStartDate = getUserPlanMeta(user)?.travelStartDate;
  if (planStartDate) {
    return planStartDate;
  }
  return user.confirmedTrips?.find((trip) => trip.status === 'ACTIVE' && trip.travelStart)?.travelStart ?? null;
}

function formatDday(value: string | null): string {
  if (!value) {
    return 'D-day -';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'D-day -';
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.ceil((targetStart - todayStart) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'D-day';
  }
  if (diffDays > 0) {
    return `D-${diffDays}`;
  }
  return `D+${Math.abs(diffDays)}`;
}

function contractProgressValue(status: ContractDocumentStatusRow | null): { submitted: number; expected: number | null; percent: number } {
  const submitted = status?.submittedCount ?? 0;
  const expected = status?.expectedCount ?? null;
  const percent = expected && expected > 0 ? Math.min(100, Math.round((submitted / expected) * 100)) : submitted > 0 ? 100 : 0;
  return { submitted, expected, percent };
}

function paymentProgressFromAmounts(received: number, required: number | null): { received: number; required: number | null; percent: number } {
  const percent = required && required > 0 ? Math.min(100, Math.round((received / required) * 100)) : received > 0 ? 100 : 0;
  return { received, required, percent };
}

function formatKrw(value: number | null | undefined): string {
  return value == null ? '?' : value.toLocaleString('ko-KR');
}

function formatContractPerson(submission: ContractSubmissionRow): string {
  return submission.travelerName ?? submission.leaderName ?? '이름 없음';
}

function formatSubmissionMeta(submission: ContractSubmissionRow): string {
  const parts = [
    submission.representativeType,
    submission.totalCompanionCount != null ? `동반 ${submission.totalCompanionCount}명` : null,
    submission.receivedStatus,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '추가 정보 없음';
}

function formatReceiptMeta(receipt: ContractPaymentReceiptRow): string {
  const parts = [
    formatOptionalDateTime(receipt.receivedAt),
    receipt.sourceRowNumber != null ? `${receipt.source.name} ${receipt.sourceRowNumber}행` : receipt.source.name,
  ].filter(Boolean);
  return parts.join(' · ');
}

function normalizePersonNameForLookup(value: string | null | undefined): string | null {
  const normalized = value?.normalize('NFKC').trim().replace(/\s+/g, '');
  return normalized || null;
}

function contractSubmissionPersonKeys(submission: ContractSubmissionRow): string[] {
  const travelerKey = normalizePersonNameForLookup(submission.travelerName);
  const leaderKey = normalizePersonNameForLookup(submission.leaderName);
  const keys: string[] = [];

  if (travelerKey) {
    keys.push(travelerKey);
  }
  if (leaderKey && leaderKey === travelerKey) {
    keys.push(leaderKey);
  }

  return keys;
}

function paymentBreakdownFromPricing(
  pricing: ReturnType<typeof getUserPlanPricing>,
  headcount: number | null,
): {
  depositPerPerson: number;
  depositTotal: number;
  securityMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
  securityUnitAmount: number;
  securityTotal: number;
  requiredTotal: number;
} | null {
  if (!pricing) {
    return null;
  }
  const teamRows = teamPaymentReferencesFromPricing(pricing);
  if (teamRows.length > 1) {
    const depositTotal = teamRows.reduce((sum, row) => sum + row.depositTotalKrw, 0);
    const securityTotal = teamRows.reduce((sum, row) => sum + row.securityTotalKrw, 0);
    const people = teamRows.reduce((sum, row) => sum + row.headcount, 0);
    const depositPerPerson = people > 0 ? Math.round(depositTotal / people) : pricing.depositAmountKrw;

    return {
      depositPerPerson,
      depositTotal,
      securityMode: teamRows.some((row) => row.securityScope === '팀당') ? 'PER_TEAM' : 'PER_PERSON',
      securityUnitAmount: people > 0 ? Math.round(securityTotal / people) : 0,
      securityTotal,
      requiredTotal: depositTotal + securityTotal,
    };
  }

  const people = headcount && headcount > 0 ? headcount : 1;
  const customerSnapshot = pricing.manualPricing?.customerPricingSnapshot;
  const depositPerPerson = customerSnapshot?.depositAmountKrw ?? pricing.depositAmountKrw;
  const securityMode = customerSnapshot?.securityDepositMode ?? pricing.securityDepositMode;
  const securityUnitAmount =
    customerSnapshot?.securityDepositUnitKrw ?? pricing.securityDepositUnitPriceKrw;
  const securityTotal =
    securityMode === 'PER_PERSON'
      ? securityUnitAmount * people
      : customerSnapshot?.securityDepositTotalKrw ?? pricing.securityDepositAmountKrw;
  const depositTotal = depositPerPerson * people;
  return {
    depositPerPerson,
    depositTotal,
    securityMode,
    securityUnitAmount,
    securityTotal,
    requiredTotal: depositTotal + securityTotal,
  };
}

type TeamPaymentReferenceRow = {
  teamOrderIndex: number;
  teamName: string;
  headcount: number;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  depositTotalKrw: number;
  securityAmountKrw: number;
  securityDepositAmountKrw: number;
  securityTotalKrw: number;
  securityScope: string;
  securityLabel: string;
  requiredReferenceKrw: number;
  requiredTotalKrw: number;
};

function teamPaymentReferenceFromSnapshotRow(row: {
  teamOrderIndex: number;
  teamName: string;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitKrw: number;
  securityDepositScope: string;
}, headcount: number): TeamPaymentReferenceRow {
  const people = headcount > 0 ? headcount : 1;
  const depositAmountKrw = row.depositAmountKrw;
  const securityScope = row.securityDepositScope;
  const securityAmountKrw =
    securityScope === '인당' || securityScope === '팀당' ? row.securityDepositUnitKrw : 0;
  const securityLabel = securityScope === '팀당' ? '보증금(팀당)' : '보증금';
  const depositTotalKrw = depositAmountKrw * people;
  const securityTotalKrw = securityScope === '팀당' ? securityAmountKrw : securityAmountKrw * people;

  return {
    teamOrderIndex: row.teamOrderIndex,
    teamName: row.teamName,
    headcount: people,
    totalAmountKrw: row.totalAmountKrw,
    depositAmountKrw,
    balanceAmountKrw: row.balanceAmountKrw,
    depositTotalKrw,
    securityAmountKrw,
    securityDepositAmountKrw: row.securityDepositAmountKrw,
    securityTotalKrw,
    securityScope,
    securityLabel,
    requiredReferenceKrw: depositAmountKrw + securityAmountKrw,
    requiredTotalKrw: depositTotalKrw + securityTotalKrw,
  };
}

function teamPaymentReferenceFromPricingRow(row: {
  teamOrderIndex: number;
  teamName: string;
  headcount?: number | null;
  totalAmountKrw: number;
  depositAmountKrw: number;
  balanceAmountKrw: number;
  securityDepositAmountKrw: number;
  securityDepositUnitPriceKrw: number;
  securityDepositMode: 'NONE' | 'PER_PERSON' | 'PER_TEAM';
}): TeamPaymentReferenceRow {
  const people = row.headcount && row.headcount > 0 ? row.headcount : 1;
  const depositAmountKrw = row.depositAmountKrw;
  const securityAmountKrw =
    row.securityDepositMode === 'PER_PERSON' || row.securityDepositMode === 'PER_TEAM'
      ? row.securityDepositUnitPriceKrw
      : 0;
  const securityScope =
    row.securityDepositMode === 'PER_PERSON' ? '인당' : row.securityDepositMode === 'PER_TEAM' ? '팀당' : '-';
  const securityLabel = row.securityDepositMode === 'PER_TEAM' ? '보증금(팀당)' : '보증금';
  const depositTotalKrw = depositAmountKrw * people;
  const securityTotalKrw = row.securityDepositMode === 'PER_TEAM' ? securityAmountKrw : securityAmountKrw * people;

  return {
    teamOrderIndex: row.teamOrderIndex,
    teamName: row.teamName,
    headcount: people,
    totalAmountKrw: row.totalAmountKrw,
    depositAmountKrw,
    balanceAmountKrw: row.balanceAmountKrw,
    depositTotalKrw,
    securityAmountKrw,
    securityDepositAmountKrw: row.securityDepositAmountKrw,
    securityTotalKrw,
    securityScope,
    securityLabel,
    requiredReferenceKrw: depositAmountKrw + securityAmountKrw,
    requiredTotalKrw: depositTotalKrw + securityTotalKrw,
  };
}

function teamPaymentReferencesFromPricing(
  pricing: ReturnType<typeof getUserPlanPricing>,
): TeamPaymentReferenceRow[] {
  if (!pricing) {
    return [];
  }

  const snapshotRows = pricing.manualPricing?.customerPricingSnapshot?.teamPricings ?? [];
  const pricingRows = pricing.teamPricings ?? [];
  if (snapshotRows.length > 1) {
    const headcountsByTeamOrder = new Map(
      pricingRows.map((row) => [row.teamOrderIndex, row.headcount && row.headcount > 0 ? row.headcount : 1]),
    );
    return snapshotRows
      .map((row) => teamPaymentReferenceFromSnapshotRow(row, headcountsByTeamOrder.get(row.teamOrderIndex) ?? 1))
      .sort((left, right) => left.teamOrderIndex - right.teamOrderIndex);
  }

  if (pricingRows.length > 1) {
    return pricingRows
      .map(teamPaymentReferenceFromPricingRow)
      .sort((left, right) => left.teamOrderIndex - right.teamOrderIndex);
  }

  return [];
}

function paymentStatusLabel(status: ContractPaymentStatusRow | null): string {
  if (!status || status.status === 'NOT_STARTED') {
    return '입금';
  }
  if (status.status === 'COMPLETED') {
    return '입금 완료';
  }
  if (status.status === 'OVERPAID') {
    return '입금 초과';
  }
  if (status.status === 'NEEDS_REVIEW') {
    return '입금 확인 필요';
  }
  return '입금';
}

function isPaymentComplete(status: ContractPaymentStatusRow | null): boolean {
  return status?.status === 'COMPLETED' || status?.status === 'OVERPAID';
}

function resolveVisibleStageForPipeline(
  user: UserRow,
  contractStatus: ContractDocumentStatusRow | null,
  paymentStatus: ContractPaymentStatusRow | null,
  today: Date,
): VisibleDealStageKey | null {
  return resolveVisibleStage(
    user,
    contractStatus,
    paymentStatus,
    MANUAL_STAGES.map((stage) => stage.key),
    today,
  ) as VisibleDealStageKey | null;
}

function formatTripNightsDays(user: UserRow): string {
  const plan = user.plans?.find((item) => item.currentVersion)?.currentVersion;
  const days = plan?.totalDays;
  if (typeof days === 'number' && days > 0) {
    return `${Math.max(0, days - 1)}박${days}일`;
  }

  const start = plan?.meta?.travelStartDate;
  const end = plan?.meta?.travelEndDate;
  if (!start || !end) {
    return '-';
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return '-';
  }
  const daysFromDates = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
  return `${Math.max(0, daysFromDates - 1)}박${daysFromDates}일`;
}

function formatTripDestination(user: UserRow): string {
  const trip = getActiveConfirmedTrip(user);
  const destination = trip?.destination?.trim();
  if (destination) {
    return destination;
  }
  const stops = user.plans?.find((item) => item.currentVersion?.planStops)?.currentVersion?.planStops ?? [];
  const firstDestination = stops.map((stop) => stop.destinationCellText.trim()).find(Boolean);
  return firstDestination ?? '-';
}

function formatAssignmentNames(
  items: Array<{ nameSnapshot: string | null; guide?: { nameKo: string; nameMn: string | null }; driver?: { nameMn: string } }>,
): string {
  const names = items
    .map((item) => item.nameSnapshot?.trim() || item.guide?.nameKo?.trim() || item.guide?.nameMn?.trim() || item.driver?.nameMn?.trim())
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(', ') : '-';
}

function formatTripPickup(user: UserRow): string {
  const plan = user.plans?.find((item) => item.currentVersion)?.currentVersion;
  const meta = plan?.meta;
  return formatPickupDropDisplay(
    meta?.pickupDate,
    meta?.pickupTime,
    meta?.pickupPlaceType,
    meta?.pickupPlaceCustomText,
  );
}

function formatTripDrop(user: UserRow): string {
  const plan = user.plans?.find((item) => item.currentVersion)?.currentVersion;
  const meta = plan?.meta;
  return formatPickupDropDisplay(
    meta?.dropDate,
    meta?.dropTime,
    meta?.dropPlaceType,
    meta?.dropPlaceCustomText,
  );
}

function formatTodayDestination(user: UserRow, today: Date): string {
  const trip = getActiveConfirmedTrip(user);
  if (!trip) {
    return '-';
  }
  const dayNumber = calculateTourDayNumber(user, trip, today);
  if (!dayNumber) {
    return '-';
  }

  const stops = user.plans?.find((item) => item.currentVersion?.planStops)?.currentVersion?.planStops ?? [];
  const destinationsByDateCell = new Map<string, string[]>();
  for (const stop of stops) {
    const dateCell = stop.dateCellText.trim();
    const destination = stop.destinationCellText.trim();
    if (!dateCell || !destination) {
      continue;
    }
    const items = destinationsByDateCell.get(dateCell) ?? [];
    if (!items.includes(destination)) {
      items.push(destination);
    }
    destinationsByDateCell.set(dateCell, items);
  }

  const distinctDateCells = Array.from(destinationsByDateCell.keys());
  const byDayIndex = distinctDateCells[dayNumber - 1];
  if (byDayIndex) {
    return destinationsByDateCell.get(byDayIndex)?.join(' → ') || '-';
  }
  return trip.destination?.trim() || '-';
}

function boardsEqual(left: BoardState, right: BoardState): boolean {
  for (const stage of STAGES) {
    const leftItems = left[stage.key];
    const rightItems = right[stage.key];
    if (leftItems.length !== rightItems.length) {
      return false;
    }

    for (let index = 0; index < leftItems.length; index += 1) {
      const leftItem = leftItems[index];
      const rightItem = rightItems[index];
      if (!leftItem || !rightItem) {
        return false;
      }
      if (leftItem.id !== rightItem.id || leftItem.dealStage !== rightItem.dealStage || leftItem.dealStageOrder !== rightItem.dealStageOrder) {
        return false;
      }
    }
  }

  return true;
}

function PipelineCard({
  user,
  disabled,
  clickDisabled = disabled,
  contractStatus,
  paymentStatus,
  onClick,
}: {
  user: UserRow;
  disabled: boolean;
  clickDisabled?: boolean;
  contractStatus: ContractDocumentStatusRow | null;
  paymentStatus: ContractPaymentStatusRow | null;
  onClick: (userId: string) => void;
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: user.id,
    disabled,
    data: {
      type: 'card',
      stage: user.dealStage,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const stageTodos = (user.userDealTodos ?? []).filter((todo) => todo.stage === user.dealStage);
  const previewTodos = stageTodos.slice(0, 3);
  const dday = formatDday(getUserTravelStartDate(user));
  const progress = contractProgressValue(contractStatus);
  const cardPaymentBreakdown = paymentBreakdownFromPricing(
    getUserPlanPricing(user),
    getUserPlanMeta(user)?.headcountTotal ?? null,
  );
  const paymentProgress = paymentProgressFromAmounts(
    paymentStatus?.receivedAmountKrw ?? 0,
    cardPaymentBreakdown?.requiredTotal ?? paymentStatus?.requiredAmountKrw ?? null,
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clickDisabled ? undefined : dealPipelineTokens.card.wrapperCursor}
      onClick={() => {
        if (clickDisabled) {
          return;
        }
        onClick(user.id);
      }}
    >
      <Card className={`${dealPipelineTokens.card.base} ${isDragging ? dealPipelineTokens.card.dragging : ''}`}>
        <div className="grid gap-1">
          <div className="flex items-start justify-between gap-2">
            <p className={dealPipelineTokens.card.title}>{formatUserCardTitle(user, contractStatus)}</p>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{dday}</span>
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-600">{contractStatusLabel(contractStatus)}</p>
              <span className="shrink-0 text-xs font-semibold text-slate-700">
                {progress.submitted}/{progress.expected ?? '?'}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  contractStatus?.status === 'OVER_SUBMITTED'
                    ? 'bg-amber-500'
                    : contractStatus?.status === 'NEEDS_REVIEW'
                      ? 'bg-rose-500'
                      : contractStatus?.status === 'COMPLETED'
                        ? 'bg-emerald-500'
                        : 'bg-slate-900'
                }`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <p
                className={`text-xs font-medium ${
                  paymentStatus?.status === 'NEEDS_REVIEW'
                    ? 'text-rose-600'
                    : paymentStatus?.status === 'OVERPAID'
                      ? 'text-amber-600'
                      : isPaymentComplete(paymentStatus)
                        ? 'text-emerald-600'
                        : 'text-slate-600'
                }`}
              >
                {paymentStatusLabel(paymentStatus)}
              </p>
              <span className="shrink-0 text-xs font-semibold text-slate-700">
                {formatKrw(paymentProgress.received)}/{formatKrw(paymentProgress.required)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all ${
                  paymentStatus?.status === 'NEEDS_REVIEW'
                    ? 'bg-rose-500'
                    : paymentStatus?.status === 'OVERPAID'
                      ? 'bg-amber-500'
                      : isPaymentComplete(paymentStatus)
                        ? 'bg-emerald-500'
                        : 'bg-orange-500'
                }`}
                style={{ width: `${paymentProgress.percent}%` }}
              />
            </div>
          </div>
        </div>

        <div className={dealPipelineTokens.card.todoPreviewWrap}>
          <div className={dealPipelineTokens.card.todoPreviewHeader}>
            <span className={dealPipelineTokens.card.todoPreviewLabel}>TODO</span>
            <span className={dealPipelineTokens.card.todoPreviewCount}>{stageTodos.length}</span>
          </div>

          {previewTodos.length === 0 ? (
            <p className={dealPipelineTokens.card.todoPreviewEmpty}>현재 단계 TODO 없음</p>
          ) : (
            <div className={dealPipelineTokens.card.todoPreviewTimelineList}>
              {previewTodos.map((todo, index) => (
                <div key={todo.id} className={dealPipelineTokens.card.todoPreviewTimelineItem}>
                  <div className={dealPipelineTokens.card.todoPreviewRail}>
                    <span
                      className={`${dealPipelineTokens.card.todoPreviewBulletBase} ${
                        todo.status === 'DONE'
                          ? dealPipelineTokens.card.todoPreviewBulletDone
                          : dealPipelineTokens.card.todoPreviewBulletActive
                      }`}
                    >
                      {index + 1}
                    </span>
                    {index < previewTodos.length - 1 ? <span className={dealPipelineTokens.card.todoPreviewConnector} /> : null}
                  </div>
                  <p className={todo.status === 'DONE' ? dealPipelineTokens.card.todoPreviewTextDone : dealPipelineTokens.card.todoPreviewText}>
                    {todo.title}
                  </p>
                </div>
              ))}

              {stageTodos.length > previewTodos.length ? (
                <p className={dealPipelineTokens.card.todoPreviewMore}>+{stageTodos.length - previewTodos.length}개 더</p>
              ) : null}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function TourPipelineCard({
  user,
  stageKey,
  today,
  onClick,
}: {
  user: UserRow;
  stageKey: TourOperationStageKey;
  today: Date;
  onClick: (userId: string) => void;
}): JSX.Element {
  const trip = getActiveConfirmedTrip(user);
  const guideNames = formatAssignmentNames(trip?.guideAssignments ?? []);
  const driverNames = formatAssignmentNames(trip?.driverAssignments ?? []);
  const title = formatUserCardTitle(user, null);
  const destination = formatTripDestination(user);
  const nightsDays = formatTripNightsDays(user);

  const rows =
    stageKey === 'TOUR_IN_PROGRESS'
      ? [
          { label: '일차', value: `${calculateTourDayNumber(user, trip!, today) ?? '?'}일차` },
          { label: '가이드', value: guideNames },
          { label: '기사', value: driverNames },
          { label: '오늘 목적지', value: formatTodayDestination(user, today) },
        ]
      : stageKey === 'TOUR_START'
        ? [
            { label: '여행', value: `${destination} · ${nightsDays}` },
            { label: '가이드', value: guideNames },
            { label: '기사', value: driverNames },
            { label: '픽업', value: formatTripPickup(user) },
          ]
        : [
            { label: '여행', value: `${destination} · ${nightsDays}` },
            { label: '가이드', value: guideNames },
            { label: '기사', value: driverNames },
            { label: '드랍', value: formatTripDrop(user) },
          ];

  return (
    <button type="button" className="w-full text-left" onClick={() => onClick(user.id)}>
      <Card className={dealPipelineTokens.card.base}>
        <div className="grid gap-2">
          <div className="flex items-start justify-between gap-2">
            <p className={dealPipelineTokens.card.title}>{title}</p>
          </div>

          <div className="grid gap-1">
            {rows.map((row) => (
              <div key={row.label} className="grid grid-cols-[64px_minmax(0,1fr)] gap-2 text-xs">
                <span className="font-medium text-slate-500">{row.label}</span>
                <span className="min-w-0 break-words font-semibold text-slate-800">{row.value || '-'}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </button>
  );
}

function PipelineColumn({
  stage,
  users,
  dragDisabled,
  today,
  contractStatusByDocumentNumber,
  paymentStatusByDocumentNumber,
  onCardClick,
}: {
  stage: { key: PipelineStageKey; label: string };
  users: UserRow[];
  dragDisabled: boolean;
  today: Date;
  contractStatusByDocumentNumber: Map<string, ContractDocumentStatusRow>;
  paymentStatusByDocumentNumber: Map<string, ContractPaymentStatusRow>;
  onCardClick: (userId: string) => void;
}): JSX.Element {
  const isManualStage = isManualStageKey(stage.key);
  const { setNodeRef, isOver } = useDroppable({
    id: isManualStage ? columnId(stage.key) : `readonly-column:${stage.key}`,
    disabled: !isManualStage,
  });

  return (
    <section
      ref={setNodeRef}
      className={`${dealPipelineTokens.column.base} ${isOver ? dealPipelineTokens.column.over : ''}`}
    >
      <header className={dealPipelineTokens.column.header}>
        <h2 className={dealPipelineTokens.column.title}>{stage.label}</h2>
        <span className={dealPipelineTokens.column.count}>{users.length}</span>
      </header>

      <SortableContext
        items={isManualStage ? users.map((user) => user.id) : users.map((user) => `${stage.key}:${user.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className={dealPipelineTokens.column.list}>
          {users.length === 0 ? (
            <Card className={dealPipelineTokens.column.emptyCard}>
              현재 단계에 고객이 없습니다.
            </Card>
          ) : null}

          {users.map((user) => {
            if (!isManualStage) {
              return (
                <TourPipelineCard
                  key={`${stage.key}:${user.id}`}
                  user={user}
                  stageKey={stage.key as TourOperationStageKey}
                  today={today}
                  onClick={onCardClick}
                />
              );
            }
            const documentNumber = normalizeContractDocumentNumberForLookup(getUserContractDocumentNumber(user));
            const contractStatus = documentNumber ? contractStatusByDocumentNumber.get(documentNumber) ?? null : null;
            return (
              <PipelineCard
                key={user.id}
                user={user}
                disabled={dragDisabled}
                contractStatus={contractStatus}
                paymentStatus={documentNumber ? paymentStatusByDocumentNumber.get(documentNumber) ?? null : null}
                onClick={onCardClick}
              />
            );
          })}
        </div>
      </SortableContext>
    </section>
  );
}

function HiddenPipelineColumn({
  users,
  contractStatusByDocumentNumber,
  paymentStatusByDocumentNumber,
  onCardClick,
}: {
  users: UserRow[];
  contractStatusByDocumentNumber: Map<string, ContractDocumentStatusRow>;
  paymentStatusByDocumentNumber: Map<string, ContractPaymentStatusRow>;
  onCardClick: (userId: string) => void;
}): JSX.Element {
  return (
    <section className={dealPipelineTokens.column.base}>
      <header className={dealPipelineTokens.column.header}>
        <div>
          <h2 className={dealPipelineTokens.column.title}>파이프라인 제외</h2>
          <p className="mt-1 text-xs font-normal text-slate-500">현재 조건상 보드에 표시되지 않는 고객</p>
        </div>
        <span className={dealPipelineTokens.column.count}>{users.length}</span>
      </header>

      <div className={dealPipelineTokens.column.list}>
        {users.length === 0 ? (
          <Card className={dealPipelineTokens.column.emptyCard}>
            제외된 고객이 없습니다.
          </Card>
        ) : null}

        {users.map((user) => {
          const documentNumber = normalizeContractDocumentNumberForLookup(getUserContractDocumentNumber(user));
          const contractStatus = documentNumber ? contractStatusByDocumentNumber.get(documentNumber) ?? null : null;
          return (
            <PipelineCard
              key={user.id}
              user={user}
              disabled
              clickDisabled={false}
              contractStatus={contractStatus}
              paymentStatus={documentNumber ? paymentStatusByDocumentNumber.get(documentNumber) ?? null : null}
              onClick={onCardClick}
            />
          );
        })}
      </div>
    </section>
  );
}

function UserDetailDrawer({
  user,
  onClose,
  onTodoChanged,
}: {
  user: UserRow | null;
  onClose: () => void;
  onTodoChanged?: () => void;
}): JSX.Element | null {
  const { employee } = useAuth();
  const [displayUser, setDisplayUser] = useState<UserRow | null>(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'contract' | 'note' | 'todo'>('contract');
  const [isEstimatePanelOpen, setIsEstimatePanelOpen] = useState(false);
  const [isConfirmationPanelOpen, setIsConfirmationPanelOpen] = useState(false);
  const [isNoteComposerOpen, setIsNoteComposerOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [todoError, setTodoError] = useState<string | null>(null);

  const activeUser = user ?? displayUser;
  const userId = activeUser?.id;
  const documentNumber = normalizeContractDocumentNumberForLookup(getUserContractDocumentNumber(activeUser));
  const currentPlanVersionId = getUserCurrentPlanVersionId(activeUser);
  const activeConfirmedTrip = activeUser ? getActiveConfirmedTrip(activeUser) : null;
  const canPreviewConfirmation = !!activeConfirmedTrip?.latestPublishedConfirmationDocument?.id;
  const { document: publishedConfirmationDocument, loading: confirmationPreviewLoading } =
    useLatestPublishedConfirmationDocument(
      isConfirmationPanelOpen ? activeConfirmedTrip?.id : undefined,
    );
  const confirmationPreviewData = useMemo(
    () =>
      publishedConfirmationDocument
        ? snapshotToDocumentData(publishedConfirmationDocument.snapshot)
        : null,
    [publishedConfirmationDocument],
  );

  useEffect(() => {
    if (user) {
      setDisplayUser(user);
      const frameId = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setIsDrawerVisible(true));
      });
      return () => window.cancelAnimationFrame(frameId);
    }
    setIsDrawerVisible(false);
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      setDisplayUser(user);
    }
  }, [user]);

  const handleDrawerStackTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.propertyName !== 'transform' && event.propertyName !== 'opacity') {
      return;
    }
    if (!isDrawerVisible && !user) {
      setDisplayUser(null);
    }
  };
  const { notes, loading: notesLoading } = useUserNotes(userId);
  const { todos, loading: todosLoading, refetch: refetchTodos } = useUserDealTodos(userId, true);
  const { submissions, loading: submissionsLoading } = useContractSubmissions(documentNumber);
  const { receipts, loading: receiptsLoading } = useContractPaymentReceipts(documentNumber);
  const { data: estimatePreviewData, loading: estimatePreviewLoading, errorMessage: estimatePreviewError } = useEstimateSource({
    mode: 'version',
    versionId: currentPlanVersionId,
    draftKey: null,
  });
  const { createUserNote, loading: noteCreating } = useCreateUserNote();
  const { updateUserDealTodoStatus, loading: todoUpdating } = useUpdateUserDealTodoStatus();

  useEffect(() => {
    setActiveTab('contract');
    setIsEstimatePanelOpen(false);
    setIsConfirmationPanelOpen(false);
    setIsNoteComposerOpen(false);
    setNoteContent('');
    setNoteError(null);
    setTodoError(null);
  }, [userId]);

  const contractPaymentRows = useMemo(() => {
    const unmatchedReceiptIds = new Set(receipts.map((receipt) => receipt.id));
    const submissionRows = submissions.map((submission) => {
      const keys = new Set(contractSubmissionPersonKeys(submission));
      const matchedReceipts = receipts.filter((receipt) => {
        const payerKey = normalizePersonNameForLookup(receipt.payerNameRaw);
        return payerKey ? keys.has(payerKey) : false;
      });
      for (const receipt of matchedReceipts) {
        unmatchedReceiptIds.delete(receipt.id);
      }
      return { submission, receipts: matchedReceipts };
    });

    return {
      submissionRows,
      unmatchedReceipts: receipts.filter((receipt) => unmatchedReceiptIds.has(receipt.id)),
    };
  }, [receipts, submissions]);

  if (!displayUser) {
    return null;
  }

  const pricing = getUserPlanPricing(displayUser);
  const pricingHeadcount = getUserPlanMeta(displayUser)?.headcountTotal ?? null;
  const paymentBreakdown = paymentBreakdownFromPricing(pricing, pricingHeadcount);
  const teamPaymentReferences = teamPaymentReferencesFromPricing(pricing);
  const hasTeamPaymentReferences = teamPaymentReferences.length > 0;
  const customerSnapshot = pricing?.manualPricing?.customerPricingSnapshot ?? null;
  const priceSummaryRows = pricing
    ? hasTeamPaymentReferences
      ? teamPaymentReferences.map((row) => ({
          key: `team-price-${row.teamOrderIndex}`,
          label: row.teamName,
          totalAmountKrw: row.totalAmountKrw,
          depositAmountKrw: row.depositAmountKrw,
          balanceAmountKrw: row.balanceAmountKrw,
          securityText:
            row.securityScope === '-'
              ? `${formatKrw(row.securityDepositAmountKrw)}원`
              : `${formatKrw(row.securityAmountKrw)}원 (${row.securityScope})`,
        }))
      : [
          {
            key: 'single-price',
            label: null,
            totalAmountKrw: customerSnapshot?.totalAmountKrw ?? pricing.totalAmountKrw,
            depositAmountKrw: customerSnapshot?.depositAmountKrw ?? pricing.depositAmountKrw,
            balanceAmountKrw: customerSnapshot?.balanceAmountKrw ?? pricing.balanceAmountKrw,
            securityText:
              (customerSnapshot?.securityDepositMode ?? pricing.securityDepositMode) === 'NONE'
                ? '없음'
                : `${formatKrw(customerSnapshot?.securityDepositUnitKrw ?? pricing.securityDepositUnitPriceKrw)}원 (${
                    (customerSnapshot?.securityDepositMode ?? pricing.securityDepositMode) === 'PER_TEAM' ? '팀당' : '인당'
                  })`,
          },
        ]
    : [];
  const requiredPaymentAmount = paymentBreakdown?.requiredTotal ?? null;
  const receivedPaymentAmount = receipts.reduce((sum, receipt) => sum + (receipt.amountKrw ?? 0), 0);
  const remainingPaymentAmount = requiredPaymentAmount == null ? null : Math.max(0, requiredPaymentAmount - receivedPaymentAmount);
  const missingContractSubmissionCount = Math.max(0, (pricingHeadcount ?? 0) - submissions.length);

  const handleCreateNote = async () => {
    const content = noteContent.trim();
    const createdBy = employee?.name?.trim() ?? '';

    if (!content) {
      setNoteError('노트 내용을 입력해주세요.');
      return;
    }
    if (!createdBy) {
      setNoteError('작성자를 입력해주세요.');
      return;
    }

    setNoteError(null);
    try {
      await createUserNote({
        userId: displayUser.id,
        content,
        createdBy,
      });
      setNoteContent('');
    } catch (_error) {
      setNoteError('노트 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleTodoStatusChange = async (todo: UserDealTodoRow, status: DealTodoStatusValue) => {
    if (todo.status === status) {
      return;
    }

    setTodoError(null);
    try {
      await updateUserDealTodoStatus({ id: todo.id, status });
      await refetchTodos();
      onTodoChanged?.();
    } catch (_error) {
      setTodoError('TODO 상태 변경에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const currentStageTodos = todos.filter((todo) => todo.stage === displayUser.dealStage);

  return (
    <div className={dealPipelineTokens.drawer.overlay} aria-hidden={!isDrawerVisible}>
      <button
        type="button"
        aria-label="닫기"
        className={`${dealPipelineTokens.drawer.backdrop} ${
          isDrawerVisible ? dealPipelineTokens.drawer.backdropOpen : dealPipelineTokens.drawer.backdropClosed
        }`}
        onClick={onClose}
      />
      <div
        className={`${dealPipelineTokens.drawer.stackShell} ${
          isDrawerVisible ? dealPipelineTokens.drawer.stackShellOpen : dealPipelineTokens.drawer.stackShellClosed
        }`}
        onTransitionEnd={handleDrawerStackTransitionEnd}
      >
      <aside className={dealPipelineTokens.drawer.panel}>
        <header className={dealPipelineTokens.drawer.header}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={dealPipelineTokens.drawer.headingTopLabel}>고객정보</p>
              <h2 className={dealPipelineTokens.drawer.headingTitle}>{displayUser.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={dealPipelineTokens.drawer.closeButton}
            >
              닫기
            </button>
          </div>

          <div className={dealPipelineTokens.drawer.infoCard}>
            <div className={dealPipelineTokens.drawer.infoRow}>
              <span className={dealPipelineTokens.drawer.infoLabel}>이메일</span>
              <span>{displayUser.email ?? '이메일 없음'}</span>
            </div>
            <div className={dealPipelineTokens.drawer.infoRow}>
              <span className={dealPipelineTokens.drawer.infoLabel}>현재 단계</span>
              <span className={dealPipelineTokens.drawer.infoEmphasis}>{stageLabel(displayUser.dealStage)}</span>
            </div>
            <div className={dealPipelineTokens.drawer.infoRow}>
              <span className={dealPipelineTokens.drawer.infoLabel}>총인원</span>
              <span>{pricingHeadcount != null ? `${pricingHeadcount}명` : '-'}</span>
            </div>
            <div className={dealPipelineTokens.drawer.infoRow}>
              <span className={dealPipelineTokens.drawer.infoLabel}>문서번호</span>
              <span>{documentNumber ?? '문서번호 없음'}</span>
            </div>
            <div className={dealPipelineTokens.drawer.infoRow}>
              <span className={dealPipelineTokens.drawer.infoLabel}>순서</span>
              <span>{displayUser.dealStageOrder + 1}번째</span>
            </div>
          </div>
        </header>

        <div className={dealPipelineTokens.drawer.tabsWrap}>
          <div className="flex items-center justify-between gap-4">
            <div className={dealPipelineTokens.drawer.tabsRow}>
              {[
                { key: 'contract', label: '계약/입금' },
                { key: 'note', label: '노트' },
                { key: 'todo', label: 'TODO' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as 'contract' | 'note' | 'todo')}
                  className={`${dealPipelineTokens.drawer.tabButtonBase} ${
                    activeTab === tab.key
                      ? dealPipelineTokens.drawer.tabButtonActive
                      : dealPipelineTokens.drawer.tabButtonInactive
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmationPanelOpen(false);
                  setIsEstimatePanelOpen((current) => !current);
                }}
                disabled={!currentPlanVersionId}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isEstimatePanelOpen
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isEstimatePanelOpen ? '견적서 닫기' : '견적서 열기'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEstimatePanelOpen(false);
                  setIsConfirmationPanelOpen((current) => !current);
                }}
                disabled={!canPreviewConfirmation}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isConfirmationPanelOpen
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {isConfirmationPanelOpen ? '확정서 닫기' : '확정서 열기'}
              </button>
            </div>
          </div>
        </div>

        <div className={dealPipelineTokens.drawer.contentWrap}>
          {activeTab === 'contract' ? (
            <section className="grid gap-4">
              <div className="grid gap-2">
                <p className={dealPipelineTokens.drawer.sectionLabel}>견적서 기준 입금액</p>
                <Card className={dealPipelineTokens.drawer.simpleCard}>
                  {pricing ? (
                    <div className="grid gap-4 text-sm">
                      <div className="w-1/4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="bg-slate-100 px-4 py-2 text-center text-xs font-semibold text-slate-700">
                          인원
                        </div>
                        <div className="px-4 py-3 text-center text-sm font-semibold text-slate-900">
                          {hasTeamPaymentReferences
                            ? teamPaymentReferences.map((row) => `${row.teamName} ${row.headcount}명`).join(' / ')
                            : `${pricingHeadcount ?? '?'}명`}
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="grid grid-cols-4 bg-slate-100 text-center text-xs font-semibold text-slate-700">
                          <div className="border-r border-slate-200 px-2 py-2">총액 (1인)</div>
                          <div className="border-r border-slate-200 px-2 py-2">예약금 (1인)</div>
                          <div className="border-r border-slate-200 px-2 py-2">잔금 (1인)</div>
                          <div className="px-2 py-2">대여 물품 보증금</div>
                        </div>
                        <div className="grid grid-cols-4 text-center text-sm font-semibold text-slate-900">
                          {(['totalAmountKrw', 'depositAmountKrw', 'balanceAmountKrw', 'securityText'] as const).map((field, index) => (
                            <div
                              key={field}
                              className={`grid min-h-[96px] content-center gap-1 px-2 py-4 ${
                                index < 3 ? 'border-r border-slate-200' : ''
                              }`}
                            >
                              {priceSummaryRows.map((row) => (
                                <div key={`${field}-${row.key}`}>
                                  {row.label ? <span>{row.label}) </span> : null}
                                  {field === 'securityText'
                                    ? row.securityText
                                    : `${formatKrw(row[field])}원`}
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">입금액 요약</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl bg-white px-3 py-2">
                            <span className="text-slate-500">현재 입금합계</span>
                            <p className="mt-1 font-semibold text-slate-900">{formatKrw(receivedPaymentAmount)}원</p>
                          </div>
                          <div className="rounded-xl bg-white px-3 py-2">
                            <span className="text-slate-500">입금 필요액</span>
                            <p className="mt-1 font-semibold text-slate-900">{formatKrw(requiredPaymentAmount)}원</p>
                          </div>
                          <div className="col-span-2 rounded-xl bg-white px-3 py-2">
                            <span className="text-slate-500">남은 입금액</span>
                            <p className={remainingPaymentAmount === 0 ? 'mt-1 font-semibold text-emerald-700' : 'mt-1 font-semibold text-orange-600'}>
                              {formatKrw(remainingPaymentAmount)}원
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 border-t border-orange-100 pt-3">
                          <p className="text-xs font-semibold text-slate-700">입금 계산 기준</p>
                          {hasTeamPaymentReferences ? (
                            <>
                              <div className="mt-2 grid gap-2">
                                {teamPaymentReferences.map((row) => (
                                  <div
                                    key={`team-payment-ref-${row.teamOrderIndex}`}
                                    className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700"
                                  >
                                    <span className="font-medium text-slate-900">{row.teamName}({row.headcount}명)</span>{' '}
                                    예약금 {formatKrw(row.depositAmountKrw)}원
                                    {row.securityAmountKrw > 0 ? (
                                      <>
                                        {' '}
                                        + {row.securityLabel} {formatKrw(row.securityAmountKrw)}원
                                      </>
                                    ) : null}
                                    {' = '}
                                    <span className="font-semibold text-orange-600">
                                      {formatKrw(row.requiredReferenceKrw)}원
                                    </span>
                                    <span className="text-slate-500">
                                      {' '}
                                      * {row.headcount}명 기준 합계 {formatKrw(row.requiredTotalKrw)}원
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <p className="mt-1 text-xs text-slate-700">
                              예약금 {formatKrw(paymentBreakdown?.depositPerPerson)}원 * {pricingHeadcount ?? '?'}명
                              {paymentBreakdown?.securityTotal ? ` + 보증금 ${formatKrw(paymentBreakdown.securityTotal)}원` : ''}
                              {' = '}
                              <span className="font-semibold text-orange-600">{formatKrw(requiredPaymentAmount)}원</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">현재 견적서 금액 정보가 없습니다.</p>
                  )}
                </Card>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <p className={dealPipelineTokens.drawer.sectionLabel}>계약서/입금 매칭 내역</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {submissions.length}/{receipts.length}
                  </span>
                </div>

                {!documentNumber ? (
                  <Card className={dealPipelineTokens.drawer.notesEmptyCard}>연결된 문서번호가 없습니다.</Card>
                ) : null}
                {submissionsLoading ? <p className={dealPipelineTokens.drawer.notesLoading}>계약서 내역을 불러오는 중...</p> : null}
                {receiptsLoading ? <p className={dealPipelineTokens.drawer.notesLoading}>입금 내역을 불러오는 중...</p> : null}
                {documentNumber && submissions.length === 0 && receipts.length === 0 && !submissionsLoading && !receiptsLoading ? (
                  <Card className={dealPipelineTokens.drawer.notesEmptyCard}>계약서 작성 내역이 없습니다.</Card>
                ) : null}
                {contractPaymentRows.submissionRows.map(({ submission, receipts: matchedReceipts }) => (
                  <Card key={submission.id} className={dealPipelineTokens.drawer.simpleCard}>
                    <div className="grid gap-3 text-sm md:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{formatContractPerson(submission)}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{formatSubmissionMeta(submission)}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            작성
                          </span>
                        </div>
                        <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-1.5 text-xs">
                          <span className="text-slate-500">작성일</span>
                          <span className="text-slate-900">{formatOptionalDateTime(submission.submittedAt)}</span>
                          <span className="text-slate-500">연락처</span>
                          <span className="text-slate-900">{submission.travelerPhone ?? '-'}</span>
                          <span className="text-slate-500">문서번호</span>
                          <span className="text-slate-900">{submission.documentNumberRaw ?? submission.documentNumberNorm ?? '-'}</span>
                          <span className="text-slate-500">출처</span>
                          <span className="text-slate-900">
                            {submission.source.name}
                            {submission.sourceRowNumber != null ? ` ${submission.sourceRowNumber}행` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-orange-50/60 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">입금</p>
                          <span className="text-xs font-semibold text-slate-600">{matchedReceipts.length}건</span>
                        </div>
                        {matchedReceipts.length === 0 ? (
                          <p className="text-xs text-slate-500">이 작성자 이름으로 매칭된 입금이 없습니다.</p>
                        ) : (
                          <div className="grid gap-2">
                            {matchedReceipts.map((receipt) => (
                              <div key={receipt.id} className="rounded-xl bg-white p-2 shadow-sm">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-semibold text-slate-900">{receipt.payerNameRaw ?? '입금자 미상'}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">{formatReceiptMeta(receipt)}</p>
                                  </div>
                                  <span className="shrink-0 font-bold text-orange-600">{formatKrw(receipt.amountKrw)}원</span>
                                </div>
                                {receipt.needsReviewReason ? (
                                  <p className="mt-1 text-xs text-rose-600">{receipt.needsReviewReason}</p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                {Array.from({ length: missingContractSubmissionCount }, (_, index) => (
                  <Card key={`missing-contract-submission-${index}`} className={dealPipelineTokens.drawer.simpleCard}>
                    <div className="grid gap-3 text-sm md:grid-cols-2">
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-500">? 작성자 미확인</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              총인원 {pricingHeadcount ?? '?'}명 중 계약서 작성 내역이 아직 부족합니다.
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                            미작성
                          </span>
                        </div>
                        <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-1.5 text-xs">
                          <span className="text-slate-500">작성일</span>
                          <span className="text-slate-500">-</span>
                          <span className="text-slate-500">연락처</span>
                          <span className="text-slate-500">-</span>
                          <span className="text-slate-500">문서번호</span>
                          <span className="text-slate-500">{documentNumber ?? '-'}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-dashed border-orange-100 bg-orange-50/40 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">입금</p>
                          <span className="text-xs font-semibold text-slate-500">0건</span>
                        </div>
                        <p className="text-xs text-slate-500">작성자 정보가 없어 입금 매칭을 기다리는 자리입니다.</p>
                      </div>
                    </div>
                  </Card>
                ))}
                {contractPaymentRows.unmatchedReceipts.map((receipt) => (
                  <Card key={receipt.id} className={dealPipelineTokens.drawer.simpleCard}>
                    <div className="grid gap-3 text-sm md:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="font-semibold text-slate-500">계약서 작성자 미매칭</p>
                        <p className="mt-1 text-xs text-slate-500">입금자 이름과 같은 계약서 작성자를 찾지 못했습니다.</p>
                      </div>
                      <div className="rounded-2xl bg-orange-50/60 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{receipt.payerNameRaw ?? '입금자 미상'}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{formatReceiptMeta(receipt)}</p>
                          </div>
                          <span className="shrink-0 font-bold text-orange-600">{formatKrw(receipt.amountKrw)}원</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === 'note' ? (
            <section className="grid gap-3">
              <div className="flex items-center justify-between">
                <p className={dealPipelineTokens.drawer.sectionLabel}>노트</p>
                <button
                  type="button"
                  onClick={() => setIsNoteComposerOpen((current) => !current)}
                  className={dealPipelineTokens.drawer.noteComposerToggle}
                >
                  {isNoteComposerOpen ? '입력 닫기' : '노트 추가'}
                </button>
              </div>

              {isNoteComposerOpen ? (
                <Card className={dealPipelineTokens.drawer.noteComposerCard}>
                  <div className="grid gap-3">
                    <div className="grid gap-1">
                      <span className={dealPipelineTokens.drawer.fieldLabel}>작성자</span>
                      <div className={`${dealPipelineTokens.drawer.fieldInput} flex items-center bg-slate-50 text-slate-600`}>
                        {employee?.name ?? '알 수 없음'}
                      </div>
                    </div>

                    <label className="grid gap-1">
                      <span className={dealPipelineTokens.drawer.fieldLabel}>내용</span>
                      <textarea
                        rows={4}
                        value={noteContent}
                        onChange={(event) => setNoteContent(event.target.value)}
                        placeholder={`${displayUser.name} 고객 관련 메모를 입력하세요.`}
                        className={dealPipelineTokens.drawer.fieldTextarea}
                      />
                    </label>

                    {noteError ? <p className={dealPipelineTokens.drawer.noteError}>{noteError}</p> : null}

                    <div>
                      <button
                        type="button"
                        onClick={handleCreateNote}
                        disabled={noteCreating}
                        className={dealPipelineTokens.drawer.noteSubmitButton}
                      >
                        {noteCreating ? '저장 중...' : '노트 저장'}
                      </button>
                    </div>
                  </div>
                </Card>
              ) : null}

              {notesLoading ? <p className={dealPipelineTokens.drawer.notesLoading}>노트를 불러오는 중...</p> : null}

              <div className="grid gap-2">
                {notes.length === 0 ? (
                  <Card className={dealPipelineTokens.drawer.notesEmptyCard}>
                    아직 작성된 노트가 없습니다.
                  </Card>
                ) : null}
                {notes.map((note: UserNoteRow) => (
                  <Card key={note.id} className={dealPipelineTokens.drawer.noteItemCard}>
                    {(() => {
                      const parts = formatDateTimeParts(note.createdAt);
                      return (
                        <div className={dealPipelineTokens.drawer.noteMetaRow}>
                          <span className={dealPipelineTokens.drawer.noteMetaAuthor}>{note.createdBy}</span>
                          <span className="inline-flex items-center gap-2">
                            <span className={dealPipelineTokens.drawer.noteMetaDateStrong}>{parts.date}</span>
                            <span className={dealPipelineTokens.drawer.noteMetaTime}>{parts.time}</span>
                          </span>
                        </div>
                      );
                    })()}
                    <p className={dealPipelineTokens.drawer.noteText}>{note.content}</p>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === 'todo' ? (
            <section className="grid gap-3">
              <p className={dealPipelineTokens.drawer.sectionLabel}>TODO · {stageLabel(displayUser.dealStage)}</p>

              {todoError ? <p className={dealPipelineTokens.drawer.todoError}>{todoError}</p> : null}
              {todosLoading ? <p className={dealPipelineTokens.drawer.todoLoading}>TODO를 불러오는 중...</p> : null}

              {currentStageTodos.length === 0 && !todosLoading ? (
                <Card className={dealPipelineTokens.drawer.todoEmptyCard}>현재 단계 TODO 없음</Card>
              ) : null}

              <div className={dealPipelineTokens.drawer.todoTimelineList}>
                {currentStageTodos.map((todo, index) => (
                  <div key={todo.id} className={dealPipelineTokens.drawer.todoTimelineItem}>
                    <div className={dealPipelineTokens.drawer.todoTimelineRail}>
                      <span
                        className={`${dealPipelineTokens.drawer.todoTimelineBulletBase} ${
                          todo.status === 'DONE'
                            ? dealPipelineTokens.drawer.todoTimelineBulletDone
                            : dealPipelineTokens.drawer.todoTimelineBulletActive
                        }`}
                      >
                        {index + 1}
                      </span>
                      {index < currentStageTodos.length - 1 ? (
                        <span className={dealPipelineTokens.drawer.todoTimelineConnector} />
                      ) : null}
                    </div>

                    <Card
                      className={todo.status === 'DONE' ? dealPipelineTokens.drawer.todoDoneCard : dealPipelineTokens.drawer.simpleCard}
                    >
                      <div
                        className={
                          todo.status === 'DONE' ? dealPipelineTokens.drawer.todoDoneMetaRow : dealPipelineTokens.drawer.todoItemMetaRow
                        }
                      >
                        <span>{formatDateTime(todo.createdAt)}</span>
                        <span>{todoStatusLabel(todo.status)}</span>
                      </div>
                      <p className={todo.status === 'DONE' ? dealPipelineTokens.drawer.todoDoneTitle : dealPipelineTokens.drawer.todoItemTitle}>
                        {todo.title}
                      </p>
                      {todo.description ? (
                        <p
                          className={
                            todo.status === 'DONE'
                              ? dealPipelineTokens.drawer.todoDoneDescription
                              : dealPipelineTokens.drawer.todoItemDescription
                          }
                        >
                          {todo.description}
                        </p>
                      ) : null}

                      <div className={dealPipelineTokens.drawer.todoStatusButtons}>
                        {(['TODO', 'DOING', 'DONE'] as DealTodoStatusValue[]).map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={todoUpdating}
                            onClick={() => handleTodoStatusChange(todo, status)}
                            className={`${dealPipelineTokens.drawer.todoStatusButtonBase} ${
                              todo.status === status
                                ? todo.status === 'DONE'
                                  ? dealPipelineTokens.drawer.todoStatusButtonDoneActive
                                  : dealPipelineTokens.drawer.todoStatusButtonActive
                                : dealPipelineTokens.drawer.todoStatusButtonInactive
                            }`}
                          >
                            {todoStatusLabel(status)}
                          </button>
                        ))}
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

        </div>
      </aside>
      <div
        aria-hidden={!isEstimatePanelOpen}
        className={`${dealPipelineTokens.drawer.estimatePanelWrap} ${
          isEstimatePanelOpen
            ? dealPipelineTokens.drawer.estimatePanelWrapOpen
            : dealPipelineTokens.drawer.estimatePanelWrapClosed
        }`}
      >
        <aside
          className={`${dealPipelineTokens.drawer.estimatePanelShell} ${
            isEstimatePanelOpen
              ? dealPipelineTokens.drawer.estimatePanelShellOpen
              : dealPipelineTokens.drawer.estimatePanelShellClosed
          }`}
        >
          <header className="border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={dealPipelineTokens.drawer.headingTopLabel}>견적서</p>
                <h2 className={dealPipelineTokens.drawer.headingTitle}>견적서 미리보기</h2>
              </div>
              <div className="flex items-center gap-2">
                {currentPlanVersionId ? (
                  <Link
                    to={`/documents/estimate?mode=version&versionId=${encodeURIComponent(currentPlanVersionId)}`}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    크게 보기
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsEstimatePanelOpen(false)}
                  className={dealPipelineTokens.drawer.closeButton}
                >
                  닫기
                </button>
              </div>
            </div>
          </header>

          <div className={dealPipelineTokens.drawer.contentWrap}>
            {!currentPlanVersionId ? (
              <Card className={dealPipelineTokens.drawer.simpleCard}>
                <p className="text-sm text-slate-500">연결된 현재 견적서 버전이 없습니다.</p>
              </Card>
            ) : null}

            {estimatePreviewLoading ? (
              <Card className={dealPipelineTokens.drawer.simpleCard}>
                <p className="text-sm text-slate-500">견적서 미리보기를 불러오는 중입니다...</p>
              </Card>
            ) : null}

            {!estimatePreviewLoading && estimatePreviewError ? (
              <Card className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {estimatePreviewError}
              </Card>
            ) : null}

            {!estimatePreviewLoading && !estimatePreviewError && estimatePreviewData ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-100/70 p-3">
                <div className="max-h-[calc(100vh-8rem)] overflow-auto rounded-2xl bg-white">
                  <div className="estimate-preview-frame">
                    <EstimatePreviewScaler>
                      <EstimateDocument data={estimatePreviewData} viewMode="screen-preview" />
                    </EstimatePreviewScaler>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
      <div
        aria-hidden={!isConfirmationPanelOpen}
        className={`${dealPipelineTokens.drawer.estimatePanelWrap} ${
          isConfirmationPanelOpen
            ? dealPipelineTokens.drawer.estimatePanelWrapOpen
            : dealPipelineTokens.drawer.estimatePanelWrapClosed
        }`}
      >
        <aside
          className={`${dealPipelineTokens.drawer.estimatePanelShell} ${
            isConfirmationPanelOpen
              ? dealPipelineTokens.drawer.estimatePanelShellOpen
              : dealPipelineTokens.drawer.estimatePanelShellClosed
          }`}
        >
          <header className="border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={dealPipelineTokens.drawer.headingTopLabel}>확정서</p>
                <h2 className={dealPipelineTokens.drawer.headingTitle}>확정서 미리보기</h2>
              </div>
              <div className="flex items-center gap-2">
                {activeConfirmedTrip?.id ? (
                  <Link
                    to={`/documents/confirmation?confirmedTripId=${encodeURIComponent(activeConfirmedTrip.id)}`}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    크게 보기
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsConfirmationPanelOpen(false)}
                  className={dealPipelineTokens.drawer.closeButton}
                >
                  닫기
                </button>
              </div>
            </div>
          </header>

          <div className={dealPipelineTokens.drawer.contentWrap}>
            {!canPreviewConfirmation ? (
              <Card className={dealPipelineTokens.drawer.simpleCard}>
                <p className="text-sm text-slate-500">발행된 확정서가 없습니다.</p>
              </Card>
            ) : null}

            {confirmationPreviewLoading ? (
              <Card className={dealPipelineTokens.drawer.simpleCard}>
                <p className="text-sm text-slate-500">확정서 미리보기를 불러오는 중입니다...</p>
              </Card>
            ) : null}

            {!confirmationPreviewLoading && confirmationPreviewData ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-100/70 p-3">
                <div className="max-h-[calc(100vh-8rem)] overflow-auto rounded-2xl bg-white">
                  <ConfirmationDocument data={confirmationPreviewData} viewMode="screen-preview" />
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
      </div>
    </div>
  );
}

export function DealPipelinePage(): JSX.Element {
  const { users, loading, refetch: refetchUsers } = useUsers();

  const { counts: contractReviewCounts } = useContractDocumentReviewTabCounts();
  const { counts: paymentReviewCounts } = useContractPaymentReviewTabCounts();
  const { runs: contractSyncRuns } = useContractSyncRuns(undefined, 1);
  const { runs: paymentSyncRuns } = useContractPaymentSyncRuns(undefined, 1);
  const { reorderDealPipeline, loading: reorderLoading } = useReorderDealPipeline();

  const [search, setSearch] = useState('');
  const [board, setBoard] = useState<BoardState>(() => createEmptyBoard());
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previousBoardRef = useRef<BoardState | null>(null);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const nextBoard = buildBoard(users);
    setBoard((current) => (boardsEqual(current, nextBoard) ? current : nextBoard));
  }, [users]);

  const normalizedKeyword = search.trim().toLowerCase();
  const dragDisabled = normalizedKeyword.length > 0 || reorderLoading;
  const contractDocumentNumbers = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map(getUserContractDocumentNumber)
            .filter((documentNumber): documentNumber is string => Boolean(documentNumber?.trim())),
        ),
      ),
    [users],
  );
  const { statuses: contractStatuses } = useContractDocumentStatuses(contractDocumentNumbers);
  const contractStatusByDocumentNumber = useMemo(
    () => new Map(contractStatuses.map((status) => [status.documentNumberNorm, status])),
    [contractStatuses],
  );
  const { statuses: paymentStatuses } = useContractPaymentStatuses(contractDocumentNumbers);
  const paymentStatusByDocumentNumber = useMemo(
    () => new Map(paymentStatuses.map((status) => [status.documentNumberNorm, status])),
    [paymentStatuses],
  );

  const pipelineVisibility = useMemo(() => {
    const getStatuses = (user: UserRow) => {
      const documentNumber = normalizeContractDocumentNumberForLookup(getUserContractDocumentNumber(user));
      return {
        contractStatus: documentNumber ? contractStatusByDocumentNumber.get(documentNumber) ?? null : null,
        paymentStatus: documentNumber ? paymentStatusByDocumentNumber.get(documentNumber) ?? null : null,
      };
    };
    const applyStageVisibility = (sourceUsers: UserRow[]): { board: BoardState; hiddenUsers: UserRow[] } => {
      const next = createEmptyBoard();
      const hiddenUsers: UserRow[] = [];

      for (const user of sourceUsers) {
        const tourStages = resolveTourOperationStages(user, today);
        if (tourStages.length > 0) {
          for (const tourStage of tourStages) {
            next[tourStage].push(user);
          }
          continue;
        }

        const { contractStatus, paymentStatus } = getStatuses(user);
        const visibleStage = resolveVisibleStageForPipeline(user, contractStatus, paymentStatus, today);
        if (visibleStage === null) {
          hiddenUsers.push(user);
          continue;
        }

        next[visibleStage].push({
          ...user,
          dealStage: visibleStage,
          dealStageOrder: next[visibleStage].length,
        });
      }

      for (const stage of STAGES) {
        next[stage.key] = sortUsersInStage(next[stage.key]).map((user, index) => ({
          ...user,
          dealStage: isManualStageKey(stage.key) ? stage.key : user.dealStage,
          dealStageOrder: index,
        }));
      }

      return { board: next, hiddenUsers: sortUsersInStage(hiddenUsers) };
    };

    const visibleUsers = normalizedKeyword
      ? users.filter((user) => {
          const nameMatched = user.name.toLowerCase().includes(normalizedKeyword);
          const emailMatched = user.email?.toLowerCase().includes(normalizedKeyword) ?? false;
          return nameMatched || emailMatched;
        })
      : users;

    return applyStageVisibility(visibleUsers);
  }, [contractStatusByDocumentNumber, normalizedKeyword, paymentStatusByDocumentNumber, today, users]);

  const displayedBoard = pipelineVisibility.board;
  const hiddenUsers = pipelineVisibility.hiddenUsers;

  const activeUser = useMemo(() => {
    if (!activeUserId) {
      return null;
    }
    for (const stage of STAGES) {
      const found = board[stage.key].find((user) => user.id === activeUserId);
      if (found) {
        return found;
      }
    }
    return null;
  }, [activeUserId, board]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const selectedUser = useMemo(() => {
    if (!selectedUserId) {
      return null;
    }
    for (const stage of STAGES) {
      const found = displayedBoard[stage.key].find((user) => user.id === selectedUserId);
      if (found) {
        return found;
      }
    }
    return users.find((user) => user.id === selectedUserId) ?? null;
  }, [displayedBoard, selectedUserId, users]);

  const findContainer = (id: string): VisibleDealStageKey | null => {
    const asColumn = parseColumnId(id);
    if (asColumn) {
      return asColumn;
    }

    for (const stage of MANUAL_STAGES) {
      if (board[stage.key].some((user) => user.id === id)) {
        return stage.key;
      }
    }

    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (dragDisabled) {
      return;
    }
    previousBoardRef.current = board;
    setActiveUserId(String(event.active.id));
    setErrorMessage(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (dragDisabled) {
      return;
    }

    const over = event.over;
    if (!over) {
      return;
    }

    const activeId = String(event.active.id);
    const overId = String(over.id);

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer) {
      return;
    }

    if (activeContainer === overContainer) {
      if (isColumnId(overId)) {
        return;
      }

      setBoard((current) => {
        const currentItems = current[activeContainer];
        const oldIndex = currentItems.findIndex((user) => user.id === activeId);
        const newIndex = currentItems.findIndex((user) => user.id === overId);

        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
          return current;
        }

        return {
          ...current,
          [activeContainer]: arrayMove(currentItems, oldIndex, newIndex),
        };
      });

      return;
    }

    setBoard((current) => {
      const sourceItems = current[activeContainer];
      const sourceIndex = sourceItems.findIndex((user) => user.id === activeId);
      if (sourceIndex < 0) {
        return current;
      }

      const moving = sourceItems[sourceIndex];
      if (!moving) {
        return current;
      }

      const nextSource = sourceItems.filter((user) => user.id !== activeId);
      const targetItems = current[overContainer];
      const targetIndex = isColumnId(overId) ? targetItems.length : targetItems.findIndex((user) => user.id === overId);
      const insertIndex = targetIndex < 0 ? targetItems.length : targetIndex;

      const nextTarget = [
        ...targetItems.slice(0, insertIndex),
        {
          ...moving,
          dealStage: overContainer,
        },
        ...targetItems.slice(insertIndex),
      ];

      return {
        ...current,
        [activeContainer]: nextSource,
        [overContainer]: nextTarget,
      };
    });
  };

  const handleDragCancel = () => {
    if (previousBoardRef.current) {
      setBoard(previousBoardRef.current);
    }
    previousBoardRef.current = null;
    setActiveUserId(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const over = event.over;

    if (!over) {
      if (previousBoardRef.current) {
        setBoard(previousBoardRef.current);
      }
      previousBoardRef.current = null;
      setActiveUserId(null);
      return;
    }

    const normalized = normalizeBoard(board);
    const before = previousBoardRef.current;

    setBoard(normalized);
    previousBoardRef.current = null;
    setActiveUserId(null);

    if (!before || boardsEqual(before, normalized)) {
      return;
    }

    try {
      await reorderDealPipeline(flattenBoardToUpdates(normalized));
      void refetchUsers();
    } catch (_error) {
      if (before) {
        setBoard(before);
      }
      setErrorMessage('단계 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <section className={dealPipelineTokens.board.section}>
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">딜 파이프라인</h1>
          <p className="mt-1 text-sm text-slate-600">고객의 진행 단계를 칸반 보드로 확인합니다.</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
          <Link
            to="/contracts/review"
            className="group flex flex-col justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition-colors hover:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">계약서 관리</span>
              <span className="text-[10px] font-medium text-slate-400">
                {formatRelativeTime(contractSyncRuns[0]?.startedAt)} 동기화
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              검토 필요 <span className="font-semibold text-slate-900">{contractReviewCounts?.needsReview ?? 0}</span>건 · 초과 제출 <span className="font-semibold text-slate-900">{contractReviewCounts?.overSubmitted ?? 0}</span>건
            </p>
          </Link>
          <Link
            to="/contracts/payments/review"
            className="group flex flex-col justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition-colors hover:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-900">입금 관리</span>
              <span className="text-[10px] font-medium text-slate-400">
                {formatRelativeTime(paymentSyncRuns[0]?.startedAt)} 동기화
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              동명이인 <span className="font-semibold text-slate-900">{paymentReviewCounts?.ambiguousPayerName ?? 0}</span>건 · 이름 불일치 <span className="font-semibold text-slate-900">{paymentReviewCounts?.nameMismatch ?? 0}</span>건
            </p>
          </Link>
          <label className="w-full sm:w-[240px]">
            <span className="sr-only">고객 검색</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="고객명 또는 이메일 검색"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            />
          </label>
        </div>
      </header>

      {normalizedKeyword ? <p className={dealPipelineTokens.board.searchHint}>검색 중에는 드래그를 잠시 비활성화합니다.</p> : null}

      {errorMessage ? <p className={dealPipelineTokens.board.errorText}>{errorMessage}</p> : null}

      {loading ? <div className={dealPipelineTokens.board.loadingText}>고객 데이터를 불러오는 중...</div> : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={dealPipelineTokens.board.track}>
          <div className={dealPipelineTokens.board.grid}>
            {STAGES.map((stage) => (
              <PipelineColumn
                key={stage.key}
                stage={stage}
                users={displayedBoard[stage.key]}
                dragDisabled={dragDisabled}
                today={today}
                contractStatusByDocumentNumber={contractStatusByDocumentNumber}
                paymentStatusByDocumentNumber={paymentStatusByDocumentNumber}
                onCardClick={setSelectedUserId}
              />
            ))}
            <HiddenPipelineColumn
              users={hiddenUsers}
              contractStatusByDocumentNumber={contractStatusByDocumentNumber}
              paymentStatusByDocumentNumber={paymentStatusByDocumentNumber}
              onCardClick={setSelectedUserId}
            />
          </div>
        </div>

        <DragOverlay>
          {activeUser ? (
            <Card className="w-[248px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <div className="grid gap-1">
                <p className="text-sm font-semibold text-slate-900">{formatUserCardTitle(activeUser, null)}</p>
              </div>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      <UserDetailDrawer
        user={selectedUser}
        onClose={() => setSelectedUserId(null)}
        onTodoChanged={() => {
          void refetchUsers();
        }}
      />
    </section>
  );
}
