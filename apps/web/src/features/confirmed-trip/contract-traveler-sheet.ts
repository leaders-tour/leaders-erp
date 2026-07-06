import { normalizeConfirmationBirthCodeDisplay } from '@tour/validation';
import type { ContractPaymentReceiptRow, ContractSubmissionRow } from '../contract/hooks';

export type TravelerRoleTag = '대표자' | '팀원' | '취소자' | '대체자';

export interface TravelerPaymentLine {
  amountKrw: number;
  tag: string | null;
}

export interface TravelerSheetColumn {
  submission: ContractSubmissionRow;
  name: string;
  roleTags: TravelerRoleTag[];
  payments: TravelerPaymentLine[];
  contractCompleted: boolean;
  hasDissent: boolean;
  specialNote: string | null;
  gender: string | null;
  birthDisplay: string | null;
  phone: string | null;
  passportPhotoUrls: string[];
}

export function normalizePersonNameForLookup(value: string | null | undefined): string | null {
  const normalized = value?.normalize('NFKC').trim().replace(/\s+/g, '');
  return normalized || null;
}

export function contractSubmissionPersonKeys(submission: ContractSubmissionRow): string[] {
  const travelerKey = normalizePersonNameForLookup(submission.travelerName);
  const leaderKey = normalizePersonNameForLookup(submission.leaderName);
  const keys: string[] = [];
  if (travelerKey) {
    keys.push(travelerKey);
  }
  if (leaderKey && !keys.includes(leaderKey)) {
    keys.push(leaderKey);
  }
  return keys;
}

function inferPaymentTag(memo: string | null | undefined, amountKrw: number | null): string | null {
  const text = memo?.trim() ?? '';
  if (/예약금/.test(text)) {
    return '예약금';
  }
  if (/보증금/.test(text)) {
    return '보증금';
  }
  if (/잔금/.test(text)) {
    return '잔금';
  }
  if (text) {
    return text.length <= 12 ? text : null;
  }
  return amountKrw != null ? null : null;
}

function resolveRoleTags(submission: ContractSubmissionRow): TravelerRoleTag[] {
  const representativeType = submission.representativeType ?? '';
  if (representativeType.includes('대표')) {
    return ['대표자'];
  }
  if (representativeType.includes('취소')) {
    return ['취소자'];
  }
  if (representativeType.includes('대체')) {
    return ['대체자'];
  }
  return ['팀원'];
}

function resolveSpecialNote(submission: ContractSubmissionRow): string | null {
  const fromAttention = submission.reviewSummary.attentionItems.find(
    (item) => item.kind === 'SPECIAL_NOTE',
  )?.detail;
  if (fromAttention?.trim()) {
    return fromAttention.trim();
  }
  const note = submission.travelerNote?.trim();
  return note || null;
}

function isContractCompleted(submission: ContractSubmissionRow): boolean {
  return !submission.reviewSummary.attentionItems.some((item) => item.kind === 'INCOMPLETE');
}

function hasDissent(submission: ContractSubmissionRow): boolean {
  return submission.reviewSummary.attentionItems.some(
    (item) => item.kind === 'DECLINED_CONSENT' || item.kind === 'ACTIVITY_OPT_OUT',
  );
}

export function buildTravelerSheetColumns(
  submissions: ContractSubmissionRow[],
  receipts: ContractPaymentReceiptRow[],
): TravelerSheetColumn[] {
  return submissions
    .filter((submission) => !submission.excludedFromContractCount)
    .map((submission) => {
    const keys = new Set(contractSubmissionPersonKeys(submission));
    const matchedReceipts = receipts.filter((receipt) => {
      const payerKey = normalizePersonNameForLookup(receipt.payerNameRaw);
      return payerKey ? keys.has(payerKey) : false;
    });

    return {
      submission,
      name: submission.travelerName ?? submission.leaderName ?? '이름 없음',
      roleTags: resolveRoleTags(submission),
      payments: matchedReceipts
        .filter((receipt) => receipt.amountKrw != null)
        .map((receipt) => ({
          amountKrw: receipt.amountKrw as number,
          tag: inferPaymentTag(receipt.memo, receipt.amountKrw),
        })),
      contractCompleted: isContractCompleted(submission),
      hasDissent: hasDissent(submission),
      specialNote: resolveSpecialNote(submission),
      gender: submission.travelerGender?.trim() || null,
      birthDisplay: normalizeConfirmationBirthCodeDisplay(submission.travelerBirthCode),
      phone: submission.travelerPhone?.trim() || null,
      passportPhotoUrls: submission.passportPhotoUrls ?? [],
    };
  });
}
