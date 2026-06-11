import { createHash, createSign } from 'node:crypto';
import type { ContractDocumentStatusValue, ContractPaymentStatusValue, Prisma, PrismaClient } from '@prisma/client';
import {
  compareContractDocumentNumbersByDateDesc,
  excludeContractSubmissionFromCountInputSchema,
  isContractDocumentNumberExpiredByDays,
  matchContractDocumentInputSchema,
  matchContractPaymentReceiptInputSchema,
  normalizeContractDocumentNumber,
  normalizeContractPersonName,
  normalizeContractPhoneDigits,
  restoreContractDocumentReviewInputSchema,
  restoreContractSubmissionToCountInputSchema,
  trashContractDocumentReviewInputSchema,
  unmatchContractDocumentInputSchema,
  unmatchContractPaymentReceiptInputSchema,
} from '@tour/validation';
import { DomainError } from '../../lib/errors';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}

interface GoogleAccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GoogleSheetMetadata {
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }>;
}

interface GoogleSheetValues {
  values?: string[][];
}

interface ParsedSheetRow {
  rowNumber: number;
  sourceRecordKey: string;
  submittedAt: Date | null;
  documentNumberRaw: string | null;
  documentNumberNorm: string | null;
  travelerName: string | null;
  travelerPhone: string | null;
  travelerPhoneDigits: string | null;
  leaderName: string | null;
  representativeType: string | null;
  totalCompanionCount: number | null;
  receivedStatus: string | null;
  rowDigest: string;
  rawJson: Record<string, string>;
}

interface ParsedPaymentSheetRow {
  rowNumber: number;
  sourceRecordKey: string;
  receivedAt: Date | null;
  payerNameRaw: string | null;
  payerNameNorm: string | null;
  amountKrw: number | null;
  rowDigest: string;
  rawJson: Record<string, string>;
}

interface SyncCounts {
  fetchedRows: number;
  upsertedRows: number;
  skippedRows: number;
}

interface PaymentSyncCounts extends SyncCounts {
  matchedRows: number;
  reviewRows: number;
}

type PlanVersionMetaForContractMatch = Prisma.PlanVersionMetaGetPayload<{
  select: {
    planVersionId: true;
    documentNumber: true;
    headcountTotal: true;
    planVersion: {
      select: {
        id: true;
        plan: {
          select: {
            currentVersionId: true;
          };
        };
        confirmedTrips: {
          where: { status: 'ACTIVE' };
          select: { id: true; paxCount: true };
          take: 1;
        };
      };
    };
  };
}>;

type ContractSubmissionForStatus = Prisma.ContractSubmissionGetPayload<{
  select: {
    documentNumberNorm: true;
    submittedAt: true;
    importedAt: true;
    documentNumberRaw: true;
    totalCompanionCount: true;
    travelerName: true;
    travelerPhoneDigits: true;
    excludedFromContractCount: true;
  };
}>;

type ContractSubmissionForPaymentMatch = Prisma.ContractSubmissionGetPayload<{
  select: {
    documentNumberNorm: true;
    travelerName: true;
    leaderName: true;
  };
}>;

type PlanVersionForPaymentMatch = Prisma.PlanVersionGetPayload<{
  select: {
    id: true;
    versionNumber: true;
    plan: {
      select: {
        currentVersionId: true;
        documentNumberBase: true;
      };
    };
    meta: {
      select: {
        documentNumber: true;
        headcountTotal: true;
      };
    };
    pricing: {
      select: {
        depositAmountKrw: true;
        securityDepositAmountKrw: true;
        securityDepositUnitPriceKrw: true;
        securityDepositMode: true;
        inputSnapshot: true;
        manualPricingSnapshot: true;
      };
    };
    confirmedTrips: {
      where: { status: 'ACTIVE' };
      select: { id: true };
      take: 1;
    };
  };
}>;

type ContractPaymentReceiptForStatus = Prisma.ContractPaymentReceiptGetPayload<{
  select: {
    matchedDocumentNumberNorm: true;
    amountKrw: true;
    needsReviewReason: true;
  };
}>;

const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function getGooglePrivateKey(): string {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new DomainError('VALIDATION_FAILED', 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is required');
  }
  return raw.replace(/\\n/g, '\n');
}

async function getGoogleSheetsAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  if (!email) {
    throw new DomainError('VALIDATION_FAILED', 'GOOGLE_SERVICE_ACCOUNT_EMAIL is required');
  }

  const now = Math.floor(Date.now() / 1000);
  const unsigned = [
    base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
    base64Url(
      JSON.stringify({
        iss: email,
        scope: GOOGLE_SHEETS_SCOPE,
        aud: GOOGLE_TOKEN_URL,
        iat: now,
        exp: now + 3600,
      }),
    ),
  ].join('.');

  const signature = createSign('RSA-SHA256').update(unsigned).sign(getGooglePrivateKey());
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = (await response.json()) as GoogleAccessTokenResponse;
  if (!response.ok || !data.access_token) {
    throw new DomainError('VALIDATION_FAILED', data.error_description ?? data.error ?? 'Failed to fetch Google access token');
  }
  return data.access_token;
}

async function fetchJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new DomainError('VALIDATION_FAILED', `Google Sheets request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

async function resolveSheetTitle(sheetId: string, sheetGid: string, accessToken: string): Promise<string> {
  const metadata = await fetchJson<GoogleSheetMetadata>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}?fields=sheets.properties(sheetId,title)`,
    accessToken,
  );
  const targetGid = Number(sheetGid);
  const sheet = metadata.sheets?.find((item) => item.properties?.sheetId === targetGid);
  const title = sheet?.properties?.title;
  if (!title) {
    throw new DomainError('NOT_FOUND', `Google sheet gid ${sheetGid} not found`);
  }
  return title;
}

async function fetchGoogleSheetRows(sheetId: string, sheetGid: string): Promise<string[][]> {
  const accessToken = await getGoogleSheetsAccessToken();
  const title = await resolveSheetTitle(sheetId, sheetGid, accessToken);
  const range = `'${title.replace(/'/g, "''")}'`;
  const data = await fetchJson<GoogleSheetValues>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}`,
    accessToken,
  );
  return data.values ?? [];
}

function cell(value: string | undefined): string | null {
  const trimmed = value?.normalize('NFKC').trim() ?? '';
  return trimmed || null;
}

function inferYearForMonthDay(month: number, day: number): number {
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month - 1, day);
  const futureThresholdMs = 45 * 24 * 60 * 60 * 1000;
  if (candidate.getTime() > now.getTime() + futureThresholdMs) {
    year -= 1;
  }
  return year;
}

function parseOptionalDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }
  const koreanDateTime = value.match(
    /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\s*(오전|오후)\s*(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (koreanDateTime) {
    const [, year, month, day, meridiem, hourRaw, minuteRaw, secondRaw] = koreanDateTime;
    let hour = Number(hourRaw);
    if (meridiem === '오후' && hour < 12) {
      hour += 12;
    }
    if (meridiem === '오전' && hour === 12) {
      hour = 0;
    }
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      hour,
      Number(minuteRaw),
      Number(secondRaw ?? '0'),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const monthDayTime = value.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (monthDayTime) {
    const [, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw] = monthDayTime;
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const year = inferYearForMonthDay(month, day);
    const parsed = new Date(
      year,
      month - 1,
      day,
      Number(hourRaw),
      Number(minuteRaw),
      Number(secondRaw ?? '0'),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const PAYMENT_RECEIVED_AT_RAW_KEYS = ['입금일시', '입금일', '거래일시', '거래일자', '날짜', '일시', 'date'];

function parsePaymentReceivedAtFromRawJson(rawJson: Record<string, string>): Date | null {
  for (const key of PAYMENT_RECEIVED_AT_RAW_KEYS) {
    const parsed = parseOptionalDate(cell(rawJson[key]));
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

function paymentReceivedAtEquals(
  left: Date | null | undefined,
  right: Date | null | undefined,
): boolean {
  return (left?.getTime() ?? null) === (right?.getTime() ?? null);
}

function parseOptionalInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const matched = value.replace(/,/g, '').match(/\d+/);
  if (!matched) {
    return null;
  }
  const parsed = Number(matched[0]);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parsePaymentAmount(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const normalized = value.normalize('NFKC').replace(/[,₩원\s]/g, '');
  const matched = normalized.match(/-?\d+/);
  if (!matched) {
    return null;
  }
  const parsed = Number(matched[0]);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function normalizeHeader(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, '').toLowerCase();
}

function findColumn(headers: string[], candidates: string[]): number {
  const normalizedHeaders = headers.map(normalizeHeader);
  const normalizedCandidates = candidates.map(normalizeHeader);
  const exact = normalizedHeaders.findIndex((header) => normalizedCandidates.includes(header));
  if (exact >= 0) {
    return exact;
  }
  return normalizedHeaders.findIndex((header) => normalizedCandidates.some((candidate) => header.includes(candidate)));
}

function requireColumn(headers: string[], candidates: string[], label: string): number {
  const index = findColumn(headers, candidates);
  if (index < 0) {
    throw new DomainError('VALIDATION_FAILED', `Contract sheet is missing required column: ${label}`);
  }
  return index;
}

function optionalColumn(headers: string[], candidates: string[]): number | null {
  const index = findColumn(headers, candidates);
  return index < 0 ? null : index;
}

function rawJsonFromRow(headers: string[], row: string[]): Record<string, string> {
  return headers.reduce<Record<string, string>>((acc, header, index) => {
    const key = header.trim() || `column_${index + 1}`;
    acc[key] = row[index] ?? '';
    return acc;
  }, {});
}

function digestRow(rawJson: Record<string, string>): string {
  return createHash('sha256').update(JSON.stringify(rawJson)).digest('hex');
}

function parseSheetRows(values: string[][], headerRow: number): ParsedSheetRow[] {
  const headerIndex = Math.max(0, headerRow - 1);
  const headers = values[headerIndex]?.map((value) => value.trim()) ?? [];
  if (headers.length === 0) {
    throw new DomainError('VALIDATION_FAILED', 'Contract sheet header row is empty');
  }

  const documentIndex = requireColumn(headers, ['계약서 상 문서번호', '문서번호', 'document number'], '문서번호');
  const travelerIndex = requireColumn(
    headers,
    ['여행객 본인 성함', '여행객 한글 성명', '여행객 성함', '본인 성함', 'traveler name'],
    '여행객 본인 성함',
  );
  const submittedAtIndex = optionalColumn(headers, ['타임스탬프', 'timestamp', '제출일시']);
  const phoneIndex = optionalColumn(headers, ['여행객 본인 연락처', '전화번호', '연락처', '휴대폰', 'phone']);
  const leaderIndex = optionalColumn(headers, ['여행대표자 성함', '대표자 성명', '대표자 성함', 'leader name']);
  const representativeIndex = optionalColumn(headers, ['팀별 대표자 여부 구분', '여행자 구분', '대표자 여부', '대표자구분']);
  const totalCompanionIndex = optionalColumn(headers, ['총 동행 여행객수', '총동행여행객수', '견적서상 기준인원', '총 인원', '인원']);
  const receivedStatusIndex = optionalColumn(headers, ['서류 수신 여부 확인', '서류수신여부', '수신 여부']);

  return values.slice(headerIndex + 1).flatMap((row, offset) => {
    if (row.every((value) => !value?.trim())) {
      return [];
    }
    const rowNumber = headerIndex + offset + 2;
    const rawJson = rawJsonFromRow(headers, row);
    const documentNumberRaw = cell(row[documentIndex]);
    const travelerName = normalizeContractPersonName(cell(row[travelerIndex]));
    return [{
      rowNumber,
      sourceRecordKey: `row:${rowNumber}`,
      submittedAt: submittedAtIndex == null ? null : parseOptionalDate(cell(row[submittedAtIndex])),
      documentNumberRaw,
      documentNumberNorm: normalizeContractDocumentNumber(documentNumberRaw),
      travelerName,
      travelerPhone: phoneIndex == null ? null : cell(row[phoneIndex]),
      travelerPhoneDigits: phoneIndex == null ? null : normalizeContractPhoneDigits(cell(row[phoneIndex])),
      leaderName: leaderIndex == null ? null : normalizeContractPersonName(cell(row[leaderIndex])),
      representativeType: representativeIndex == null ? null : cell(row[representativeIndex]),
      totalCompanionCount: totalCompanionIndex == null ? null : parseOptionalInteger(cell(row[totalCompanionIndex])),
      receivedStatus: receivedStatusIndex == null ? null : cell(row[receivedStatusIndex]),
      rowDigest: digestRow(rawJson),
      rawJson,
    }];
  });
}

function parsePaymentSheetRows(values: string[][], headerRow: number): ParsedPaymentSheetRow[] {
  const headerIndex = Math.max(0, headerRow - 1);
  const headers = values[headerIndex]?.map((value) => value.trim()) ?? [];
  if (headers.length === 0) {
    throw new DomainError('VALIDATION_FAILED', 'Payment sheet header row is empty');
  }

  const payerNameIndex = requireColumn(headers, ['입금자명', '성명', '이름', '보낸사람', '보내는분', 'payer name'], '입금자명');
  const amountIndex = requireColumn(headers, ['금액', '입금액', '거래금액', 'amount'], '금액');
  const receivedAtIndex = optionalColumn(headers, ['입금일시', '입금일', '거래일시', '거래일자', '날짜', '일시', 'date']);

  return values.slice(headerIndex + 1).flatMap((row, offset) => {
    if (row.every((value) => !value?.trim())) {
      return [];
    }
    const rowNumber = headerIndex + offset + 2;
    const rawJson = rawJsonFromRow(headers, row);
    const payerNameRaw = cell(row[payerNameIndex]);
    return [{
      rowNumber,
      sourceRecordKey: `row:${rowNumber}`,
      receivedAt: receivedAtIndex == null ? null : parseOptionalDate(cell(row[receivedAtIndex])),
      payerNameRaw,
      payerNameNorm: normalizeContractPersonName(payerNameRaw),
      amountKrw: parsePaymentAmount(cell(row[amountIndex])),
      rowDigest: digestRow(rawJson),
      rawJson,
    }];
  });
}

function compactError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function stripDocumentVersionSuffix(documentNumberNorm: string): string {
  return documentNumberNorm.replace(/V\d+$/i, '');
}

function documentNumberBaseKey(documentNumberNorm: string): string {
  return stripDocumentVersionSuffix(documentNumberNorm);
}

function documentNumberLookupKeys(documentNumberNorm: string): string[] {
  const base = documentNumberBaseKey(documentNumberNorm);
  return base === documentNumberNorm ? [documentNumberNorm] : [base, documentNumberNorm];
}

function documentNumberVariantFilter(documentNumberNorm: string): { equals: string } | { startsWith: string } {
  return { startsWith: `${documentNumberBaseKey(documentNumberNorm)}V` };
}

function contractSubmissionDocumentWhere(documentNumbers: string[]): Prisma.ContractSubmissionWhereInput {
  const bases = Array.from(new Set(documentNumbers.map(documentNumberBaseKey)));
  return {
    OR: bases.flatMap((base) => [
      { documentNumberNorm: base },
      { documentNumberNorm: documentNumberVariantFilter(base) },
    ]),
  };
}

function contractPaymentReceiptDocumentWhere(documentNumbers: string[]): Prisma.ContractPaymentReceiptWhereInput {
  const bases = Array.from(new Set(documentNumbers.map(documentNumberBaseKey)));
  return {
    OR: bases.flatMap((base) => [
      { matchedDocumentNumberNorm: base },
      { matchedDocumentNumberNorm: documentNumberVariantFilter(base) },
    ]),
  };
}

function hasDocumentNumberBase(documentNumberNorm: string | null | undefined, base: string): boolean {
  return documentNumberNorm ? documentNumberBaseKey(documentNumberNorm) === base : false;
}

const REVIEW_EXPIRY_STATUSES: ContractDocumentStatusValue[] = ['NEEDS_REVIEW', 'OVER_SUBMITTED'];

export type ContractDocumentReviewVisibility = 'VISIBLE' | 'HIDDEN';

type ReviewTrashRow = {
  status: ContractDocumentStatusValue;
  documentNumberNorm: string;
  reviewTrashedAt: Date | null;
  reviewTrashRestoredAt: Date | null;
};

function isInReviewTrash(row: ReviewTrashRow, referenceDate = new Date()): boolean {
  if (!REVIEW_EXPIRY_STATUSES.includes(row.status)) {
    return false;
  }
  if (row.reviewTrashedAt) {
    return true;
  }
  if (row.reviewTrashRestoredAt) {
    return false;
  }
  return isContractDocumentNumberExpiredByDays(row.documentNumberNorm, 7, referenceDate);
}

function matchesReviewVisibility(
  row: ReviewTrashRow,
  visibility: ContractDocumentReviewVisibility,
  referenceDate = new Date(),
): boolean {
  const trashed = isInReviewTrash(row, referenceDate);
  return visibility === 'HIDDEN' ? trashed : !trashed;
}

function paymentStatusForAmounts(input: {
  requiredAmountKrw: number | null;
  receivedAmountKrw: number;
  matchedPlanVersionId: string | null;
  hasReviewReceipt: boolean;
}): { status: ContractPaymentStatusValue; reason: string | null } {
  if (input.hasReviewReceipt) {
    return { status: 'NEEDS_REVIEW', reason: 'RECEIPT_REVIEW_REQUIRED' };
  }
  if (!input.matchedPlanVersionId) {
    return { status: 'NEEDS_REVIEW', reason: 'NO_MATCHED_PLAN_VERSION' };
  }
  if (input.requiredAmountKrw == null) {
    return { status: 'NEEDS_REVIEW', reason: 'MISSING_REQUIRED_AMOUNT' };
  }
  if (input.receivedAmountKrw <= 0) {
    return { status: 'NOT_STARTED', reason: null };
  }
  if (input.receivedAmountKrw < input.requiredAmountKrw) {
    return { status: 'PARTIAL', reason: null };
  }
  if (input.receivedAmountKrw === input.requiredAmountKrw) {
    return { status: 'COMPLETED', reason: null };
  }
  return { status: 'OVERPAID', reason: null };
}

function dedupeSubmissionCount(rows: Array<{ travelerName: string | null; travelerPhoneDigits: string | null }>): {
  count: number;
  hasCollision: boolean;
} {
  const seen = new Set<string>();
  let hasCollision = false;
  for (const row of rows) {
    if (!row.travelerName) {
      hasCollision = true;
      continue;
    }
    const key = row.travelerPhoneDigits ? `${row.travelerName}:${row.travelerPhoneDigits}` : `name:${row.travelerName}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
  }
  return { count: seen.size, hasCollision };
}

function resolveStatus(input: {
  submittedCount: number;
  expectedCount: number | null;
  matchedPlanVersionId: string | null;
  hasCollision: boolean;
}): { status: ContractDocumentStatusValue; reason: string | null } {
  if (!input.matchedPlanVersionId) {
    return { status: 'NEEDS_REVIEW', reason: 'NO_MATCHED_PLAN_VERSION' };
  }
  if (input.expectedCount == null || input.expectedCount <= 0) {
    return { status: 'NEEDS_REVIEW', reason: 'MISSING_EXPECTED_COUNT' };
  }
  if (input.hasCollision) {
    return { status: 'NEEDS_REVIEW', reason: 'DEDUPLICATION_REVIEW_REQUIRED' };
  }
  if (input.submittedCount === 0) {
    return { status: 'NOT_STARTED', reason: null };
  }
  if (input.submittedCount < input.expectedCount) {
    return { status: 'IN_PROGRESS', reason: null };
  }
  if (input.submittedCount === input.expectedCount) {
    return { status: 'COMPLETED', reason: null };
  }
  return { status: 'OVER_SUBMITTED', reason: null };
}

function findMetaByPlanVersionId(
  metas: PlanVersionMetaForContractMatch[],
  planVersionId: string | null | undefined,
): PlanVersionMetaForContractMatch | null {
  if (!planVersionId) {
    return null;
  }
  return metas.find((meta) => meta.planVersionId === planVersionId) ?? null;
}

function findCurrentMetaByDocumentBase(
  metas: PlanVersionMetaForContractMatch[],
  documentNumberNorm: string,
): PlanVersionMetaForContractMatch | null {
  const base = documentNumberBaseKey(documentNumberNorm);
  const candidates = metas.filter((meta) => {
    const normalized = normalizeContractDocumentNumber(meta.documentNumber);
    return normalized ? documentNumberBaseKey(normalized) === base : false;
  });
  if (candidates.length === 0) {
    return null;
  }
  return candidates.find((meta) => meta.planVersion.id === meta.planVersion.plan.currentVersionId)
    ?? candidates[0]
    ?? null;
}

function effectiveMatchedPlanVersionId(row: {
  manualMatchedPlanVersionId: string | null;
  matchedPlanVersionId: string | null;
}): string | null {
  return row.manualMatchedPlanVersionId ?? row.matchedPlanVersionId;
}

export class ContractSyncService {
  constructor(private readonly prisma: PrismaLike) {}

  listSources() {
    return this.prisma.contractSubmissionSource.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async listStatuses(documentNumbers: string[]) {
    const normalized = Array.from(new Set(documentNumbers.map(normalizeContractDocumentNumber).filter(isPresent)));
    if (normalized.length === 0) {
      return [];
    }
    const lookupKeys = Array.from(new Set(normalized.flatMap(documentNumberLookupKeys)));
    const rows = await this.prisma.contractDocumentStatus.findMany({
      where: { documentNumberNorm: { in: lookupKeys } },
    });
    const byNorm = new Map(rows.map((row) => [row.documentNumberNorm, row]));
    return normalized.map((documentNumberNorm) => {
      const fallback = documentNumberLookupKeys(documentNumberNorm).map((key) => byNorm.get(key)).find(isPresent);
      return fallback ? { ...fallback, documentNumberNorm } : {
        id: `synthetic:${documentNumberNorm}`,
        documentNumberNorm,
        documentNumberRawSample: null,
        expectedCount: null,
        submittedCount: 0,
        status: 'NOT_STARTED' as ContractDocumentStatusValue,
        needsReviewReason: null,
        firstSubmittedAt: null,
        lastSubmittedAt: null,
        matchedPlanVersionId: null,
        matchedConfirmedTripId: null,
        manualMatchedPlanVersionId: null,
        manualMatchedByEmployeeId: null,
        manualMatchedAt: null,
        manualMatchNote: null,
        computedAt: new Date(0),
        updatedAt: new Date(0),
      };
    });
  }

  listSubmissions(documentNumber: string) {
    const normalized = normalizeContractDocumentNumber(documentNumber);
    if (!normalized) {
      return [];
    }

    return this.prisma.contractSubmission.findMany({
      where: contractSubmissionDocumentWhere([normalized]),
      include: { source: true },
      orderBy: [
        { submittedAt: 'desc' },
        { importedAt: 'desc' },
        { sourceRowNumber: 'asc' },
      ],
    });
  }

  listSyncRuns(sourceId: string | undefined, limit: number) {
    return this.prisma.contractSyncRun.findMany({
      where: sourceId ? { sourceId } : undefined,
      orderBy: { startedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async syncGoogleSheetSource(sourceId: string) {
    const run = await this.prisma.contractSyncRun.create({
      data: { sourceId, status: 'RUNNING' },
    });

    try {
      const counts = await this.processGoogleSheetSource(sourceId);
      const updated = await this.prisma.contractSyncRun.update({
        where: { id: run.id },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
          fetchedRows: counts.fetchedRows,
          upsertedRows: counts.upsertedRows,
          skippedRows: counts.skippedRows,
        },
      });
      return updated;
    } catch (error) {
      await this.prisma.contractSyncRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorMessage: compactError(error),
        },
      });
      throw error;
    }
  }

  private async processGoogleSheetSource(sourceId: string): Promise<SyncCounts> {
    const source = await this.prisma.contractSubmissionSource.findUnique({ where: { id: sourceId } });
    if (!source) {
      throw new DomainError('NOT_FOUND', 'Contract submission source not found');
    }
    if (source.type !== 'GOOGLE_SHEET') {
      throw new DomainError('VALIDATION_FAILED', 'Contract submission source is not a Google Sheet');
    }
    const sheetId = source.sheetId ?? process.env.CONTRACT_FORM_SHEET_ID?.trim();
    const sheetGid = source.sheetGid ?? process.env.CONTRACT_FORM_SHEET_GID?.trim() ?? '0';
    if (!sheetId) {
      throw new DomainError('VALIDATION_FAILED', 'Contract form sheet id is required');
    }

    const rows = parseSheetRows(await fetchGoogleSheetRows(sheetId, sheetGid), source.headerRow ?? 1);
    const existingRows = await this.prisma.contractSubmission.findMany({
      where: {
        sourceId,
        sourceRecordKey: { in: rows.map((row) => row.sourceRecordKey) },
      },
      select: { sourceRecordKey: true, rowDigest: true },
    });
    const existingDigestByKey = new Map(existingRows.map((row) => [row.sourceRecordKey, row.rowDigest]));

    let upsertedRows = 0;
    let skippedRows = 0;
    const affectedDocumentNumbers = new Set<string>();

    for (const row of rows) {
      if (row.documentNumberNorm) {
        affectedDocumentNumbers.add(row.documentNumberNorm);
      }
      if (existingDigestByKey.get(row.sourceRecordKey) === row.rowDigest) {
        skippedRows += 1;
        continue;
      }

      await this.prisma.contractSubmission.upsert({
        where: {
          sourceId_sourceRecordKey: {
            sourceId,
            sourceRecordKey: row.sourceRecordKey,
          },
        },
        create: {
          sourceId,
          sourceRowNumber: row.rowNumber,
          sourceRecordKey: row.sourceRecordKey,
          submittedAt: row.submittedAt,
          documentNumberRaw: row.documentNumberRaw,
          documentNumberNorm: row.documentNumberNorm,
          travelerName: row.travelerName,
          travelerPhone: row.travelerPhone,
          travelerPhoneDigits: row.travelerPhoneDigits,
          leaderName: row.leaderName,
          representativeType: row.representativeType,
          totalCompanionCount: row.totalCompanionCount,
          receivedStatus: row.receivedStatus,
          rowDigest: row.rowDigest,
          rawJson: row.rawJson,
        },
        update: {
          sourceRowNumber: row.rowNumber,
          submittedAt: row.submittedAt,
          documentNumberRaw: row.documentNumberRaw,
          documentNumberNorm: row.documentNumberNorm,
          travelerName: row.travelerName,
          travelerPhone: row.travelerPhone,
          travelerPhoneDigits: row.travelerPhoneDigits,
          leaderName: row.leaderName,
          representativeType: row.representativeType,
          totalCompanionCount: row.totalCompanionCount,
          receivedStatus: row.receivedStatus,
          rowDigest: row.rowDigest,
          rawJson: row.rawJson,
        },
      });
      upsertedRows += 1;
    }

    const affectedDocumentNumberList = [...affectedDocumentNumbers];
    await this.recomputeDocumentStatuses(affectedDocumentNumberList);
    if (affectedDocumentNumberList.length > 0) {
      await new ContractPaymentSyncService(this.prisma).recomputePaymentStatuses(affectedDocumentNumberList);
    }

    return {
      fetchedRows: rows.length,
      upsertedRows,
      skippedRows,
    };
  }

  async recomputeDocumentStatuses(documentNumbers?: string[]) {
    const normalized = documentNumbers?.length
      ? Array.from(new Set(documentNumbers.map(normalizeContractDocumentNumber).filter(isPresent).map(documentNumberBaseKey)))
      : (await this.prisma.contractSubmission.findMany({
          where: { documentNumberNorm: { not: null } },
          distinct: ['documentNumberNorm'],
          select: { documentNumberNorm: true },
        })).map((row) => row.documentNumberNorm).filter(isPresent).map(documentNumberBaseKey);
    const documentNumberBases = Array.from(new Set(normalized));
    if (documentNumberBases.length === 0) {
      return;
    }

    const metas = await this.prisma.planVersionMeta.findMany({
      select: {
        planVersionId: true,
        documentNumber: true,
        headcountTotal: true,
        planVersion: {
          select: {
            id: true,
            plan: {
              select: {
                currentVersionId: true,
              },
            },
            confirmedTrips: {
              where: { status: 'ACTIVE' },
              select: { id: true, paxCount: true },
              take: 1,
            },
          },
        },
      },
    });
    const submissions = await this.prisma.contractSubmission.findMany({
      where: contractSubmissionDocumentWhere(documentNumberBases),
      select: {
        documentNumberNorm: true,
        submittedAt: true,
        importedAt: true,
        documentNumberRaw: true,
        totalCompanionCount: true,
        travelerName: true,
        travelerPhoneDigits: true,
        excludedFromContractCount: true,
      },
      orderBy: [{ submittedAt: 'asc' }, { importedAt: 'asc' }],
    });
    const submissionsByDocumentNumber = new Map<string, ContractSubmissionForStatus[]>();
    for (const submission of submissions) {
      if (!submission.documentNumberNorm) {
        continue;
      }
      const key = documentNumberBaseKey(submission.documentNumberNorm);
      const items = submissionsByDocumentNumber.get(key) ?? [];
      items.push(submission);
      submissionsByDocumentNumber.set(key, items);
    }

    for (const documentNumberNorm of documentNumberBases) {
      await this.recomputeDocumentStatus(documentNumberNorm, metas, submissionsByDocumentNumber);
    }
  }

  private async recomputeDocumentStatus(
    documentNumberNorm: string,
    metas: PlanVersionMetaForContractMatch[],
    submissionsByDocumentNumber: Map<string, ContractSubmissionForStatus[]>,
  ) {
    const documentNumberBase = documentNumberBaseKey(documentNumberNorm);
    const submissions = submissionsByDocumentNumber.get(documentNumberBase) ?? [];
    if (submissions.length === 0) {
      return;
    }

    const existingRows = await this.prisma.contractDocumentStatus.findMany({
      where: {
        OR: [
          { documentNumberNorm: documentNumberBase },
          { documentNumberNorm: { startsWith: `${documentNumberBase}V` } },
        ],
      },
      select: {
        documentNumberNorm: true,
        manualMatchedPlanVersionId: true,
        manualMatchedByEmployeeId: true,
        manualMatchedAt: true,
        manualMatchNote: true,
      },
    });
    const existing =
      existingRows.find((row) => row.documentNumberNorm === documentNumberBase)
      ?? existingRows.find((row) => row.manualMatchedPlanVersionId)
      ?? existingRows[0]
      ?? null;

    const matchedMeta = findCurrentMetaByDocumentBase(metas, documentNumberNorm);
    const autoPlanVersionId = matchedMeta?.planVersionId ?? null;
    const effectivePlanVersionId = existing?.manualMatchedPlanVersionId ?? autoPlanVersionId;
    const effectiveMeta = findMetaByPlanVersionId(metas, effectivePlanVersionId) ?? matchedMeta;
    const matchedTrip = effectiveMeta?.planVersion.confirmedTrips[0] ?? null;
    const fallbackCount = submissions.find((row) => row.totalCompanionCount != null)?.totalCompanionCount ?? null;
    const expectedCount = effectiveMeta?.headcountTotal ?? matchedTrip?.paxCount ?? fallbackCount;
    const countedSubmissions = submissions.filter((row) => !row.excludedFromContractCount);
    const { count: submittedCount, hasCollision } = dedupeSubmissionCount(countedSubmissions);
    const status = resolveStatus({
      submittedCount,
      expectedCount,
      matchedPlanVersionId: effectivePlanVersionId,
      hasCollision,
    });

    await this.prisma.contractDocumentStatus.upsert({
      where: { documentNumberNorm: documentNumberBase },
      create: {
        documentNumberNorm: documentNumberBase,
        documentNumberRawSample: submissions.find((row) => row.documentNumberRaw)?.documentNumberRaw ?? null,
        expectedCount,
        submittedCount,
        status: status.status,
        needsReviewReason: status.reason,
        firstSubmittedAt: submissions.find((row) => row.submittedAt)?.submittedAt ?? null,
        lastSubmittedAt: submissions.slice().reverse().find((row) => row.submittedAt)?.submittedAt ?? null,
        matchedPlanVersionId: autoPlanVersionId,
        matchedConfirmedTripId: matchedTrip?.id ?? null,
        manualMatchedPlanVersionId: existing?.manualMatchedPlanVersionId ?? null,
        manualMatchedByEmployeeId: existing?.manualMatchedByEmployeeId ?? null,
        manualMatchedAt: existing?.manualMatchedAt ?? null,
        manualMatchNote: existing?.manualMatchNote ?? null,
        computedAt: new Date(),
      },
      update: {
        documentNumberRawSample: submissions.find((row) => row.documentNumberRaw)?.documentNumberRaw ?? null,
        expectedCount,
        submittedCount,
        status: status.status,
        needsReviewReason: status.reason,
        firstSubmittedAt: submissions.find((row) => row.submittedAt)?.submittedAt ?? null,
        lastSubmittedAt: submissions.slice().reverse().find((row) => row.submittedAt)?.submittedAt ?? null,
        matchedPlanVersionId: autoPlanVersionId,
        matchedConfirmedTripId: matchedTrip?.id ?? null,
        computedAt: new Date(),
      },
    });
    await this.prisma.contractDocumentStatus.deleteMany({
      where: { documentNumberNorm: { startsWith: `${documentNumberBase}V` } },
    });
  }

  async listReviewItems(input: {
    statuses?: ContractDocumentStatusValue[];
    keyword?: string;
    limit?: number;
    visibility?: ContractDocumentReviewVisibility;
  }) {
    const statuses = input.statuses?.length
      ? input.statuses
      : (['NEEDS_REVIEW', 'OVER_SUBMITTED'] as ContractDocumentStatusValue[]);
    const limit = Math.min(Math.max(input.limit ?? 100, 1), 200);
    const keyword = input.keyword?.trim().toLowerCase() ?? '';
    const visibility = input.visibility ?? 'VISIBLE';
    const referenceDate = new Date();

    const rows = await this.prisma.contractDocumentStatus.findMany({
      where: { status: { in: statuses } },
    });

    let filteredRows = rows.filter((row) => matchesReviewVisibility(row, visibility, referenceDate));
    if (keyword) {
      const documentNumbers = rows.map((row) => row.documentNumberNorm);
      const submissions = documentNumbers.length
        ? await this.prisma.contractSubmission.findMany({
            where: contractSubmissionDocumentWhere(documentNumbers),
            select: {
              documentNumberNorm: true,
              travelerName: true,
              leaderName: true,
              documentNumberRaw: true,
            },
          })
        : [];
      const submissionsByDocumentNumber = new Map<string, typeof submissions>();
      for (const submission of submissions) {
        if (!submission.documentNumberNorm) {
          continue;
        }
        const key = documentNumberBaseKey(submission.documentNumberNorm);
        const items = submissionsByDocumentNumber.get(key) ?? [];
        items.push(submission);
        submissionsByDocumentNumber.set(key, items);
      }

      filteredRows = rows.filter((row) => {
        if (row.documentNumberNorm.toLowerCase().includes(keyword)) {
          return true;
        }
        if (row.documentNumberRawSample?.toLowerCase().includes(keyword)) {
          return true;
        }
        const relatedSubmissions = submissionsByDocumentNumber.get(documentNumberBaseKey(row.documentNumberNorm)) ?? [];
        return relatedSubmissions.some((submission) => {
          return (
            submission.travelerName?.toLowerCase().includes(keyword)
            || submission.leaderName?.toLowerCase().includes(keyword)
            || submission.documentNumberRaw?.toLowerCase().includes(keyword)
          );
        });
      });
    }

    const selectedRows = filteredRows
      .slice()
      .sort((left, right) =>
        compareContractDocumentNumbersByDateDesc(left.documentNumberNorm, right.documentNumberNorm),
      )
      .slice(0, limit);
    const effectiveVersionIds = Array.from(new Set(
      selectedRows
        .map((row) => effectiveMatchedPlanVersionId(row))
        .filter(isPresent),
    ));
    const planIdByVersionId = effectiveVersionIds.length
      ? new Map(
          (await this.prisma.planVersion.findMany({
            where: { id: { in: effectiveVersionIds } },
            select: { id: true, planId: true },
          })).map((row) => [row.id, row.planId] as const),
        )
      : new Map<string, string>();
    const matchedPlanSummaryByVersionId = effectiveVersionIds.length
      ? new Map(
          (await this.prisma.planVersionMeta.findMany({
            where: { planVersionId: { in: effectiveVersionIds } },
            select: {
              planVersionId: true,
              documentNumber: true,
              leaderName: true,
              headcountTotal: true,
              travelStartDate: true,
              travelEndDate: true,
              planVersion: {
                select: {
                  versionNumber: true,
                  plan: {
                    select: {
                      id: true,
                      title: true,
                      user: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          })).map((row) => [row.planVersionId, row] as const),
        )
      : new Map<string, {
        planVersionId: string;
        documentNumber: string;
        leaderName: string;
        headcountTotal: number;
        travelStartDate: Date;
        travelEndDate: Date;
        planVersion: {
          versionNumber: number;
          plan: {
            id: string;
            title: string;
            user: { id: string; name: string };
          };
        };
      }>();
    const submissionsBySelected = selectedRows.length
      ? await this.prisma.contractSubmission.findMany({
          where: contractSubmissionDocumentWhere(selectedRows.map((row) => row.documentNumberNorm)),
          include: { source: true },
          orderBy: [{ submittedAt: 'desc' }, { importedAt: 'desc' }, { sourceRowNumber: 'asc' }],
        })
      : [];

    return selectedRows.map((statusRow) => {
      const versionId = effectiveMatchedPlanVersionId(statusRow);
      const meta = versionId ? matchedPlanSummaryByVersionId.get(versionId) : null;
      return {
        statusRow: {
          ...statusRow,
          effectiveMatchedPlanVersionId: versionId,
          effectiveMatchedPlanId: versionId ? planIdByVersionId.get(versionId) ?? null : null,
        },
        matchedPlanSummary: meta
          ? {
              planVersionId: meta.planVersionId,
              planId: meta.planVersion.plan.id,
              planTitle: meta.planVersion.plan.title,
              versionNumber: meta.planVersion.versionNumber,
              userId: meta.planVersion.plan.user.id,
              userName: meta.planVersion.plan.user.name,
              documentNumber: meta.documentNumber,
              leaderName: meta.leaderName,
              headcountTotal: meta.headcountTotal,
              travelStartDate: meta.travelStartDate,
              travelEndDate: meta.travelEndDate,
              isManualMatch: Boolean(statusRow.manualMatchedPlanVersionId),
            }
          : null,
        submissions: submissionsBySelected.filter((submission) => {
          if (!submission.documentNumberNorm) {
            return false;
          }
          return hasDocumentNumberBase(submission.documentNumberNorm, documentNumberBaseKey(statusRow.documentNumberNorm));
        }),
      };
    });
  }

  async getReviewTabCounts() {
    const counts = await this.prisma.contractDocumentStatus.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const byStatus = new Map(counts.map((row) => [row.status, row._count._all]));
    const tabStatuses: ContractDocumentStatusValue[] = [
      'NOT_STARTED',
      'IN_PROGRESS',
      'COMPLETED',
      'OVER_SUBMITTED',
      'NEEDS_REVIEW',
    ];
    const expiryRows = await this.prisma.contractDocumentStatus.findMany({
      where: { status: { in: REVIEW_EXPIRY_STATUSES } },
      select: {
        status: true,
        documentNumberNorm: true,
        reviewTrashedAt: true,
        reviewTrashRestoredAt: true,
      },
    });
    const referenceDate = new Date();
    let trashedNeedsReview = 0;
    let trashedOverSubmitted = 0;
    for (const row of expiryRows) {
      if (!isInReviewTrash(row, referenceDate)) {
        continue;
      }
      if (row.status === 'NEEDS_REVIEW') {
        trashedNeedsReview += 1;
      } else if (row.status === 'OVER_SUBMITTED') {
        trashedOverSubmitted += 1;
      }
    }

    const rawNeedsReview = byStatus.get('NEEDS_REVIEW') ?? 0;
    const rawOverSubmitted = byStatus.get('OVER_SUBMITTED') ?? 0;
    const visibleNeedsReview = rawNeedsReview - trashedNeedsReview;
    const visibleOverSubmitted = rawOverSubmitted - trashedOverSubmitted;
    const inProgress = byStatus.get('IN_PROGRESS') ?? 0;
    const completed = byStatus.get('COMPLETED') ?? 0;
    const notStarted = byStatus.get('NOT_STARTED') ?? 0;

    return {
      needsReview: visibleNeedsReview,
      overSubmitted: visibleOverSubmitted,
      inProgress,
      completed,
      trashed: trashedNeedsReview + trashedOverSubmitted,
      all: visibleNeedsReview + visibleOverSubmitted + inProgress + completed + notStarted,
    };
  }

  async trashContractDocumentReview(input: unknown, employeeId: string) {
    const parsed = trashContractDocumentReviewInputSchema.parse(input);
    const documentNumberNorm = normalizeContractDocumentNumber(parsed.documentNumber);
    if (!documentNumberNorm) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid document number');
    }

    const existing = await this.prisma.contractDocumentStatus.findUnique({ where: { documentNumberNorm } });
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Contract document status not found');
    }
    if (!REVIEW_EXPIRY_STATUSES.includes(existing.status)) {
      throw new DomainError('VALIDATION_FAILED', 'Only review or over-submitted documents can be trashed');
    }

    const updated = await this.prisma.contractDocumentStatus.update({
      where: { documentNumberNorm },
      data: {
        reviewTrashedAt: new Date(),
        reviewTrashedByEmployeeId: employeeId,
        reviewTrashReason: parsed.reason ?? null,
        reviewTrashRestoredAt: null,
      },
    });

    return {
      ...updated,
      effectiveMatchedPlanVersionId: effectiveMatchedPlanVersionId(updated),
    };
  }

  async restoreContractDocumentReview(input: unknown) {
    const parsed = restoreContractDocumentReviewInputSchema.parse(input);
    const documentNumberNorm = normalizeContractDocumentNumber(parsed.documentNumber);
    if (!documentNumberNorm) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid document number');
    }

    const existing = await this.prisma.contractDocumentStatus.findUnique({ where: { documentNumberNorm } });
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Contract document status not found');
    }
    if (!REVIEW_EXPIRY_STATUSES.includes(existing.status)) {
      throw new DomainError('VALIDATION_FAILED', 'Only review or over-submitted documents can be restored');
    }
    if (!isInReviewTrash(existing)) {
      throw new DomainError('VALIDATION_FAILED', 'Document is not in review trash');
    }

    const updated = await this.prisma.contractDocumentStatus.update({
      where: { documentNumberNorm },
      data: existing.reviewTrashedAt
        ? {
            reviewTrashedAt: null,
            reviewTrashedByEmployeeId: null,
            reviewTrashReason: null,
          }
        : {
            reviewTrashRestoredAt: new Date(),
          },
    });

    return {
      ...updated,
      effectiveMatchedPlanVersionId: effectiveMatchedPlanVersionId(updated),
    };
  }

  async searchPlanVersionCandidates(keyword: string, limit = 20) {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
      return [];
    }

    const rows = await this.prisma.planVersionMeta.findMany({
      where: {
        OR: [
          { documentNumber: { contains: normalizedKeyword } },
          { leaderName: { contains: normalizedKeyword } },
          { planVersion: { plan: { user: { name: { contains: normalizedKeyword } } } } },
          { planVersion: { plan: { title: { contains: normalizedKeyword } } } },
        ],
      },
      select: {
        planVersionId: true,
        documentNumber: true,
        leaderName: true,
        headcountTotal: true,
        travelStartDate: true,
        travelEndDate: true,
        planVersion: {
          select: {
            versionNumber: true,
            plan: {
              select: {
                id: true,
                title: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { travelStartDate: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
    });

    return rows.map((row) => ({
      planVersionId: row.planVersionId,
      planId: row.planVersion.plan.id,
      planTitle: row.planVersion.plan.title,
      versionNumber: row.planVersion.versionNumber,
      userId: row.planVersion.plan.user.id,
      userName: row.planVersion.plan.user.name,
      documentNumber: row.documentNumber,
      leaderName: row.leaderName,
      headcountTotal: row.headcountTotal,
      travelStartDate: row.travelStartDate,
      travelEndDate: row.travelEndDate,
    }));
  }

  async matchContractDocument(input: unknown, employeeId: string) {
    const parsed = matchContractDocumentInputSchema.parse(input);
    const documentNumberNorm = normalizeContractDocumentNumber(parsed.documentNumber);
    if (!documentNumberNorm) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid contract document number');
    }

    const planVersion = await this.prisma.planVersion.findUnique({
      where: { id: parsed.planVersionId },
      select: { id: true, meta: { select: { id: true } } },
    });
    if (!planVersion?.meta) {
      throw new DomainError('NOT_FOUND', 'Plan version not found');
    }

    const submissionCount = await this.prisma.contractSubmission.count({
      where: contractSubmissionDocumentWhere([documentNumberNorm]),
    });
    if (submissionCount === 0) {
      throw new DomainError('VALIDATION_FAILED', 'No contract submissions found for document number');
    }

    await this.prisma.contractDocumentStatus.upsert({
      where: { documentNumberNorm },
      create: {
        documentNumberNorm,
        submittedCount: submissionCount,
        status: 'NEEDS_REVIEW',
        manualMatchedPlanVersionId: parsed.planVersionId,
        manualMatchedByEmployeeId: employeeId,
        manualMatchedAt: new Date(),
        manualMatchNote: parsed.note ?? null,
        computedAt: new Date(),
      },
      update: {
        manualMatchedPlanVersionId: parsed.planVersionId,
        manualMatchedByEmployeeId: employeeId,
        manualMatchedAt: new Date(),
        manualMatchNote: parsed.note ?? null,
      },
    });

    await this.recomputeDocumentStatuses([documentNumberNorm]);
    const updated = await this.prisma.contractDocumentStatus.findUnique({ where: { documentNumberNorm } });
    if (!updated) {
      throw new DomainError('NOT_FOUND', 'Contract document status not found after match');
    }
    return {
      ...updated,
      effectiveMatchedPlanVersionId: effectiveMatchedPlanVersionId(updated),
    };
  }

  async unmatchContractDocument(input: unknown) {
    const parsed = unmatchContractDocumentInputSchema.parse(input);
    const documentNumberNorm = normalizeContractDocumentNumber(parsed.documentNumber);
    if (!documentNumberNorm) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid contract document number');
    }

    const existing = await this.prisma.contractDocumentStatus.findUnique({ where: { documentNumberNorm } });
    if (!existing) {
      throw new DomainError('NOT_FOUND', 'Contract document status not found');
    }

    await this.prisma.contractDocumentStatus.update({
      where: { documentNumberNorm },
      data: {
        manualMatchedPlanVersionId: null,
        manualMatchedByEmployeeId: null,
        manualMatchedAt: null,
        manualMatchNote: null,
      },
    });

    await this.recomputeDocumentStatuses([documentNumberNorm]);
    const updated = await this.prisma.contractDocumentStatus.findUnique({ where: { documentNumberNorm } });
    if (!updated) {
      throw new DomainError('NOT_FOUND', 'Contract document status not found after unmatch');
    }
    return {
      ...updated,
      effectiveMatchedPlanVersionId: effectiveMatchedPlanVersionId(updated),
    };
  }

  async excludeContractSubmissionFromCount(input: unknown, employeeId: string) {
    const parsed = excludeContractSubmissionFromCountInputSchema.parse(input);
    const submission = await this.prisma.contractSubmission.findUnique({
      where: { id: parsed.submissionId },
      select: { id: true, documentNumberNorm: true },
    });
    if (!submission) {
      throw new DomainError('NOT_FOUND', 'Contract submission not found');
    }
    if (!submission.documentNumberNorm) {
      throw new DomainError('VALIDATION_FAILED', 'Submission has no document number');
    }

    const updated = await this.prisma.contractSubmission.update({
      where: { id: parsed.submissionId },
      data: {
        excludedFromContractCount: true,
        excludedByEmployeeId: employeeId,
        excludedAt: new Date(),
        exclusionReason: parsed.reason ?? null,
      },
      include: { source: true },
    });

    await this.recomputeDocumentStatuses([submission.documentNumberNorm]);
    return updated;
  }

  async restoreContractSubmissionToCount(input: unknown) {
    const parsed = restoreContractSubmissionToCountInputSchema.parse(input);
    const submission = await this.prisma.contractSubmission.findUnique({
      where: { id: parsed.submissionId },
      select: { id: true, documentNumberNorm: true },
    });
    if (!submission) {
      throw new DomainError('NOT_FOUND', 'Contract submission not found');
    }
    if (!submission.documentNumberNorm) {
      throw new DomainError('VALIDATION_FAILED', 'Submission has no document number');
    }

    const updated = await this.prisma.contractSubmission.update({
      where: { id: parsed.submissionId },
      data: {
        excludedFromContractCount: false,
        excludedByEmployeeId: null,
        excludedAt: null,
        exclusionReason: null,
      },
      include: { source: true },
    });

    await this.recomputeDocumentStatuses([submission.documentNumberNorm]);
    return updated;
  }
}

interface MatchedPaymentRow extends ParsedPaymentSheetRow {
  matchedDocumentNumberNorm: string | null;
  needsReviewReason: string | null;
}

interface PaymentMatchContext {
  documentNumbersByName: Map<string, Set<string>>;
  planVersions: PlanVersionForPaymentMatch[];
}

function buildPaymentMatchContext(
  submissions: ContractSubmissionForPaymentMatch[],
  planVersions: PlanVersionForPaymentMatch[],
): PaymentMatchContext {
  const documentNumbersByName = new Map<string, Set<string>>();
  const addCandidate = (name: string | null, documentNumber: string | null) => {
    const normalizedName = normalizeContractPersonName(name);
    const normalizedDocumentNumber = normalizeContractDocumentNumber(documentNumber);
    if (!normalizedName || !normalizedDocumentNumber) {
      return;
    }
    const candidates = documentNumbersByName.get(normalizedName) ?? new Set<string>();
    candidates.add(documentNumberBaseKey(normalizedDocumentNumber));
    documentNumbersByName.set(normalizedName, candidates);
  };

  for (const submission of submissions) {
    addCandidate(submission.travelerName, submission.documentNumberNorm);
    addCandidate(submission.leaderName, submission.documentNumberNorm);
  }

  return { documentNumbersByName, planVersions };
}

function planVersionDocumentNumber(planVersion: PlanVersionForPaymentMatch): string | null {
  return normalizeContractDocumentNumber(planVersion.meta?.documentNumber);
}

function getPaymentPlanVersionForDocument(
  documentNumberNorm: string,
  planVersions: PlanVersionForPaymentMatch[],
): PlanVersionForPaymentMatch | null {
  const base = documentNumberBaseKey(documentNumberNorm);
  const candidates = planVersions.filter((planVersion) => {
    const normalized = planVersionDocumentNumber(planVersion);
    return normalized ? documentNumberBaseKey(normalized) === base : false;
  });
  if (candidates.length === 0) {
    return null;
  }

  return candidates.find((planVersion) => planVersion.id === planVersion.plan.currentVersionId)
    ?? candidates.slice().sort((left, right) => right.versionNumber - left.versionNumber)[0]
    ?? null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function headcountForPricing(planVersion: PlanVersionForPaymentMatch): number {
  const metaHeadcount = planVersion.meta?.headcountTotal;
  if (typeof metaHeadcount === 'number' && metaHeadcount > 0) {
    return metaHeadcount;
  }

  const inputSnapshot = asRecord(planVersion.pricing?.inputSnapshot);
  const inputHeadcount = numberValue(inputSnapshot?.headcountTotal);
  return inputHeadcount && inputHeadcount > 0 ? inputHeadcount : 1;
}

function securityDepositTotalForPayment(input: {
  totalAmount: number | null;
  unitAmount: number | null;
  mode: unknown;
  headcount: number;
}): number {
  if (input.mode === 'NONE') {
    return 0;
  }
  if (input.mode === 'PER_PERSON') {
    if (input.unitAmount != null && input.unitAmount > 0) {
      return input.unitAmount * input.headcount;
    }
    return input.totalAmount ?? 0;
  }
  return input.totalAmount ?? input.unitAmount ?? 0;
}

function customerSecurityDepositTotalKrw(
  customerSnapshot: Record<string, unknown> | null,
  headcount: number,
): number | null {
  if (!customerSnapshot) {
    return null;
  }
  const mode = customerSnapshot.securityDepositMode;
  const unitKrw = numberValue(customerSnapshot.securityDepositUnitKrw);
  const totalKrw = numberValue(customerSnapshot.securityDepositTotalKrw);
  if (mode === 'NONE') {
    return 0;
  }
  if (mode === 'PER_PERSON') {
    if (unitKrw != null && unitKrw > 0) {
      return unitKrw * headcount;
    }
    return totalKrw;
  }
  return totalKrw ?? unitKrw;
}

function requiredPaymentAmount(planVersion: PlanVersionForPaymentMatch | null): number | null {
  const pricing = planVersion?.pricing;
  if (!planVersion || !pricing) {
    return null;
  }

  const manualSnapshot = asRecord(pricing.manualPricingSnapshot);
  const customerSnapshot = asRecord(manualSnapshot?.customerPricingSnapshot);
  const customerDepositAmount = numberValue(customerSnapshot?.depositAmountKrw);
  const customerSecurityAmount = customerSecurityDepositTotalKrw(customerSnapshot, headcountForPricing(planVersion));
  const headcount = headcountForPricing(planVersion);
  if (customerDepositAmount != null || customerSecurityAmount != null) {
    return (customerDepositAmount ?? 0) * headcount + (customerSecurityAmount ?? 0);
  }

  return (
    pricing.depositAmountKrw * headcount +
    securityDepositTotalForPayment({
      totalAmount: pricing.securityDepositAmountKrw,
      unitAmount: pricing.securityDepositUnitPriceKrw,
      mode: pricing.securityDepositMode,
      headcount,
    })
  );
}

function matchPaymentRow(row: ParsedPaymentSheetRow, context: PaymentMatchContext): MatchedPaymentRow {
  if (!row.payerNameNorm) {
    return { ...row, matchedDocumentNumberNorm: null, needsReviewReason: 'MISSING_PAYER_NAME' };
  }
  if (row.amountKrw == null || row.amountKrw <= 0) {
    return { ...row, matchedDocumentNumberNorm: null, needsReviewReason: 'INVALID_AMOUNT' };
  }

  const candidates = Array.from(context.documentNumbersByName.get(row.payerNameNorm) ?? []);
  if (candidates.length === 0) {
    return { ...row, matchedDocumentNumberNorm: null, needsReviewReason: 'NO_MATCHED_CONTRACT_SUBMISSION_NAME' };
  }
  if (candidates.length === 1) {
    return { ...row, matchedDocumentNumberNorm: candidates[0] ?? null, needsReviewReason: null };
  }

  const amountMatched = candidates.filter((documentNumberNorm) => {
    const planVersion = getPaymentPlanVersionForDocument(documentNumberNorm, context.planVersions);
    return requiredPaymentAmount(planVersion) === row.amountKrw;
  });
  if (amountMatched.length === 1) {
    return { ...row, matchedDocumentNumberNorm: amountMatched[0] ?? null, needsReviewReason: null };
  }

  return { ...row, matchedDocumentNumberNorm: null, needsReviewReason: 'AMBIGUOUS_PAYER_NAME' };
}

export class ContractPaymentSyncService {
  constructor(private readonly prisma: PrismaLike) {}

  listSources() {
    return this.prisma.contractPaymentSource.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async listStatuses(documentNumbers: string[]) {
    const normalized = Array.from(new Set(documentNumbers.map(normalizeContractDocumentNumber).filter(isPresent)));
    if (normalized.length === 0) {
      return [];
    }
    const lookupKeys = Array.from(new Set(normalized.flatMap(documentNumberLookupKeys)));
    const rows = await this.prisma.contractPaymentStatus.findMany({
      where: { documentNumberNorm: { in: lookupKeys } },
    });
    const byNorm = new Map(rows.map((row) => [row.documentNumberNorm, row]));
    return normalized.map((documentNumberNorm) => {
      const fallback = documentNumberLookupKeys(documentNumberNorm).map((key) => byNorm.get(key)).find(isPresent);
      return fallback ? { ...fallback, documentNumberNorm } : {
        id: `synthetic:${documentNumberNorm}`,
        documentNumberNorm,
        requiredAmountKrw: null,
        receivedAmountKrw: 0,
        status: 'NOT_STARTED' as ContractPaymentStatusValue,
        needsReviewReason: null,
        matchedPlanVersionId: null,
        computedAt: new Date(0),
        updatedAt: new Date(0),
      };
    });
  }

  listReceipts(documentNumber: string) {
    const normalized = normalizeContractDocumentNumber(documentNumber);
    if (!normalized) {
      return [];
    }

    return this.prisma.contractPaymentReceipt.findMany({
      where: contractPaymentReceiptDocumentWhere([normalized]),
      include: { source: true },
      orderBy: [
        { receivedAt: 'desc' },
        { importedAt: 'desc' },
        { sourceRowNumber: 'asc' },
      ],
    });
  }

  listSyncRuns(sourceId: string | undefined, limit: number) {
    return this.prisma.contractPaymentSyncRun.findMany({
      where: sourceId ? { sourceId } : undefined,
      orderBy: { startedAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  async getReviewTabCount() {
    return this.prisma.contractPaymentReceipt.count({
      where: {
        OR: [
          { matchedDocumentNumberNorm: null },
          { needsReviewReason: { not: null } },
        ],
      },
    });
  }

  async reparseStoredPaymentReceivedAt() {
    const receipts = await this.prisma.contractPaymentReceipt.findMany({
      select: {
        id: true,
        receivedAt: true,
        rawJson: true,
      },
    });

    let updated = 0;
    const updateBatchSize = 50;
    const pendingUpdates: Array<{ id: string; receivedAt: Date }> = [];

    for (const receipt of receipts) {
      const reparsed = parsePaymentReceivedAtFromRawJson(receipt.rawJson as Record<string, string>);
      if (!reparsed || paymentReceivedAtEquals(receipt.receivedAt, reparsed)) {
        continue;
      }
      pendingUpdates.push({ id: receipt.id, receivedAt: reparsed });
    }

    for (let index = 0; index < pendingUpdates.length; index += updateBatchSize) {
      const batch = pendingUpdates.slice(index, index + updateBatchSize);
      await Promise.all(batch.map((row) => this.prisma.contractPaymentReceipt.update({
        where: { id: row.id },
        data: { receivedAt: row.receivedAt },
      })));
      updated += batch.length;
    }

    return {
      scanned: receipts.length,
      updated,
    };
  }

  async listReviewReceipts(args: { keyword?: string; reasons?: string[]; limit?: number }) {
    const limit = args.limit == null ? undefined : Math.min(Math.max(args.limit, 1), 5000);
    const keyword = args.keyword?.trim() ?? '';
    const keywordLower = keyword.toLowerCase();
    const reasons = Array.from(new Set((args.reasons ?? []).map((reason) => reason.trim()).filter(Boolean)));

    const submissions = await this.prisma.contractSubmission.findMany({
      where: { documentNumberNorm: { not: null } },
      select: {
        documentNumberNorm: true,
        travelerName: true,
        leaderName: true,
      },
    });
    const context = buildPaymentMatchContext(submissions, []);

    const keywordOr: Prisma.ContractPaymentReceiptWhereInput[] = [];
    if (keyword) {
      keywordOr.push(
        { payerNameRaw: { contains: keyword } },
        { payerNameNorm: { contains: keywordLower } },
        { needsReviewReason: { contains: keyword } },
        { matchedDocumentNumberNorm: { contains: keyword } },
      );

      const amountParsed = Number(keyword.replace(/,/g, ''));
      if (Number.isSafeInteger(amountParsed) && amountParsed > 0) {
        keywordOr.push({ amountKrw: amountParsed });
      }

      const rowNumberParsed = Number(keyword);
      if (Number.isSafeInteger(rowNumberParsed) && rowNumberParsed > 0) {
        keywordOr.push({ sourceRowNumber: rowNumberParsed });
      }

      const payerNormsFromDocKeyword: string[] = [];
      for (const [nameNorm, documentNumbers] of context.documentNumbersByName) {
        if ([...documentNumbers].some((documentNumber) => documentNumber.toLowerCase().includes(keywordLower))) {
          payerNormsFromDocKeyword.push(nameNorm);
        }
      }
      if (payerNormsFromDocKeyword.length > 0) {
        keywordOr.push({ payerNameNorm: { in: payerNormsFromDocKeyword } });
      }
    }

    const where: Prisma.ContractPaymentReceiptWhereInput = {
      AND: [
        {
          OR: [
            { matchedDocumentNumberNorm: null },
            { needsReviewReason: { not: null } },
          ],
        },
        ...(reasons.length > 0 ? [{ needsReviewReason: { in: reasons } }] : []),
        ...(keywordOr.length > 0 ? [{ OR: keywordOr }] : []),
      ],
    };

    const rows = await this.prisma.contractPaymentReceipt.findMany({
      where,
      include: { source: true },
      orderBy: [
        { importedAt: 'desc' },
        { sourceRowNumber: 'desc' },
      ],
      ...(limit != null ? { take: limit } : {}),
    });

    return rows.map((receipt) => ({
      receipt,
      candidateDocumentNumbers: receipt.payerNameNorm
        ? Array.from(context.documentNumbersByName.get(receipt.payerNameNorm) ?? []).sort()
        : [],
    }));
  }

  async matchContractPaymentReceipt(input: unknown) {
    const parsed = matchContractPaymentReceiptInputSchema.parse(input);
    const documentNumberNorm = normalizeContractDocumentNumber(parsed.documentNumber);
    if (!documentNumberNorm) {
      throw new DomainError('VALIDATION_FAILED', 'Invalid contract document number');
    }

    const receipt = await this.prisma.contractPaymentReceipt.findUnique({
      where: { id: parsed.receiptId },
      include: { source: true },
    });
    if (!receipt) {
      throw new DomainError('NOT_FOUND', 'Contract payment receipt not found');
    }

    const submissionCount = await this.prisma.contractSubmission.count({
      where: contractSubmissionDocumentWhere([documentNumberNorm]),
    });
    if (submissionCount === 0) {
      throw new DomainError('VALIDATION_FAILED', 'No contract submissions found for document number');
    }

    const previousDocumentNumberNorm = receipt.matchedDocumentNumberNorm;
    const updated = await this.prisma.contractPaymentReceipt.update({
      where: { id: parsed.receiptId },
      data: {
        matchedDocumentNumberNorm: documentNumberNorm,
        needsReviewReason: null,
      },
      include: { source: true },
    });

    const affectedDocumentNumbers = Array.from(new Set(
      [documentNumberNorm, previousDocumentNumberNorm].filter(isPresent),
    ));
    await this.recomputePaymentStatuses(affectedDocumentNumbers);
    return updated;
  }

  async unmatchContractPaymentReceipt(input: unknown) {
    const parsed = unmatchContractPaymentReceiptInputSchema.parse(input);
    const receipt = await this.prisma.contractPaymentReceipt.findUnique({
      where: { id: parsed.receiptId },
    });
    if (!receipt) {
      throw new DomainError('NOT_FOUND', 'Contract payment receipt not found');
    }

    const previousDocumentNumberNorm = receipt.matchedDocumentNumberNorm;
    const [submissions, planVersions] = await Promise.all([
      this.prisma.contractSubmission.findMany({
        where: { documentNumberNorm: { not: null } },
        select: {
          documentNumberNorm: true,
          travelerName: true,
          leaderName: true,
        },
      }),
      this.prisma.planVersion.findMany({
        select: {
          id: true,
          versionNumber: true,
          plan: {
            select: {
              currentVersionId: true,
              documentNumberBase: true,
            },
          },
          meta: {
            select: {
              documentNumber: true,
              headcountTotal: true,
            },
          },
          pricing: {
            select: {
              depositAmountKrw: true,
              securityDepositAmountKrw: true,
              securityDepositUnitPriceKrw: true,
              securityDepositMode: true,
              inputSnapshot: true,
              manualPricingSnapshot: true,
            },
          },
          confirmedTrips: {
            where: { status: 'ACTIVE' },
            select: { id: true },
            take: 1,
          },
        },
      }),
    ]);
    const context = buildPaymentMatchContext(submissions, planVersions);
    const rematched = matchPaymentRow({
      rowNumber: receipt.sourceRowNumber ?? 0,
      sourceRecordKey: receipt.sourceRecordKey,
      receivedAt: receipt.receivedAt,
      payerNameRaw: receipt.payerNameRaw,
      payerNameNorm: receipt.payerNameNorm,
      amountKrw: receipt.amountKrw,
      rowDigest: receipt.rowDigest,
      rawJson: receipt.rawJson as Record<string, string>,
    }, context);

    const updated = await this.prisma.contractPaymentReceipt.update({
      where: { id: parsed.receiptId },
      data: {
        matchedDocumentNumberNorm: rematched.matchedDocumentNumberNorm,
        needsReviewReason: rematched.needsReviewReason,
      },
      include: { source: true },
    });

    const affectedDocumentNumbers = Array.from(new Set(
      [previousDocumentNumberNorm, rematched.matchedDocumentNumberNorm].filter(isPresent),
    ));
    if (affectedDocumentNumbers.length > 0) {
      await this.recomputePaymentStatuses(affectedDocumentNumbers, planVersions);
    }
    return updated;
  }

  async syncGoogleSheetSource(sourceId: string) {
    const run = await this.prisma.contractPaymentSyncRun.create({
      data: { sourceId, status: 'RUNNING' },
    });

    try {
      const counts = await this.processGoogleSheetSource(sourceId);
      return this.prisma.contractPaymentSyncRun.update({
        where: { id: run.id },
        data: {
          status: 'SUCCESS',
          finishedAt: new Date(),
          fetchedRows: counts.fetchedRows,
          upsertedRows: counts.upsertedRows,
          skippedRows: counts.skippedRows,
          matchedRows: counts.matchedRows,
          reviewRows: counts.reviewRows,
        },
      });
    } catch (error) {
      await this.prisma.contractPaymentSyncRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorMessage: compactError(error),
        },
      });
      throw error;
    }
  }

  private async processGoogleSheetSource(sourceId: string): Promise<PaymentSyncCounts> {
    const source = await this.prisma.contractPaymentSource.findUnique({ where: { id: sourceId } });
    if (!source) {
      throw new DomainError('NOT_FOUND', 'Contract payment source not found');
    }
    if (source.type !== 'GOOGLE_SHEET') {
      throw new DomainError('VALIDATION_FAILED', 'Contract payment source is not a Google Sheet');
    }

    const sheetId = source.sheetId ?? process.env.CONTRACT_PAYMENT_SHEET_ID?.trim();
    const sheetGid = source.sheetGid ?? process.env.CONTRACT_PAYMENT_SHEET_GID?.trim() ?? '0';
    if (!sheetId) {
      throw new DomainError('VALIDATION_FAILED', 'Contract payment sheet id is required');
    }

    const rows = parsePaymentSheetRows(await fetchGoogleSheetRows(sheetId, sheetGid), source.headerRow ?? 1);
    const [existingRows, submissions, planVersions] = await Promise.all([
      this.prisma.contractPaymentReceipt.findMany({
        where: {
          sourceId,
          sourceRecordKey: { in: rows.map((row) => row.sourceRecordKey) },
        },
        select: {
          sourceRecordKey: true,
          rowDigest: true,
          matchedDocumentNumberNorm: true,
          needsReviewReason: true,
          receivedAt: true,
        },
      }),
      this.prisma.contractSubmission.findMany({
        where: { documentNumberNorm: { not: null } },
        select: {
          documentNumberNorm: true,
          travelerName: true,
          leaderName: true,
        },
      }),
      this.prisma.planVersion.findMany({
        select: {
          id: true,
          versionNumber: true,
          plan: {
            select: {
              currentVersionId: true,
              documentNumberBase: true,
            },
          },
          meta: {
            select: {
              documentNumber: true,
              headcountTotal: true,
            },
          },
          pricing: {
            select: {
              depositAmountKrw: true,
              securityDepositAmountKrw: true,
              securityDepositUnitPriceKrw: true,
              securityDepositMode: true,
              inputSnapshot: true,
              manualPricingSnapshot: true,
            },
          },
          confirmedTrips: {
            where: { status: 'ACTIVE' },
            select: { id: true },
            take: 1,
          },
        },
      }),
    ]);
    const existingByKey = new Map(existingRows.map((row) => [row.sourceRecordKey, row]));
    const context = buildPaymentMatchContext(submissions, planVersions);

    let upsertedRows = 0;
    let skippedRows = 0;
    let matchedRows = 0;
    let reviewRows = 0;
    const affectedDocumentNumbers = new Set<string>();
    const rowsToCreate: Prisma.ContractPaymentReceiptCreateManyInput[] = [];
    const rowsToUpdate: Array<{ sourceRecordKey: string; data: Prisma.ContractPaymentReceiptUpdateInput }> = [];

    for (const parsedRow of rows) {
      const row = matchPaymentRow(parsedRow, context);
      if (row.matchedDocumentNumberNorm) {
        matchedRows += 1;
        affectedDocumentNumbers.add(row.matchedDocumentNumberNorm);
      }
      if (row.needsReviewReason) {
        reviewRows += 1;
      }

      const existing = existingByKey.get(row.sourceRecordKey);
      if (
        existing?.rowDigest === row.rowDigest
        && existing.matchedDocumentNumberNorm === row.matchedDocumentNumberNorm
        && existing.needsReviewReason === row.needsReviewReason
        && paymentReceivedAtEquals(existing.receivedAt, row.receivedAt)
      ) {
        skippedRows += 1;
        continue;
      }

      if (!existing) {
        rowsToCreate.push({
          sourceId,
          sourceRowNumber: row.rowNumber,
          sourceRecordKey: row.sourceRecordKey,
          receivedAt: row.receivedAt,
          payerNameRaw: row.payerNameRaw,
          payerNameNorm: row.payerNameNorm,
          amountKrw: row.amountKrw,
          matchedDocumentNumberNorm: row.matchedDocumentNumberNorm,
          needsReviewReason: row.needsReviewReason,
          rowDigest: row.rowDigest,
          rawJson: row.rawJson,
        });
      } else {
        rowsToUpdate.push({
          sourceRecordKey: row.sourceRecordKey,
          data: {
            sourceRowNumber: row.rowNumber,
            receivedAt: row.receivedAt,
            payerNameRaw: row.payerNameRaw,
            payerNameNorm: row.payerNameNorm,
            amountKrw: row.amountKrw,
            matchedDocumentNumberNorm: row.matchedDocumentNumberNorm,
            needsReviewReason: row.needsReviewReason,
            rowDigest: row.rowDigest,
            rawJson: row.rawJson,
          },
        });
      }
    }

    if (rowsToCreate.length > 0) {
      const created = await this.prisma.contractPaymentReceipt.createMany({
        data: rowsToCreate,
        skipDuplicates: true,
      });
      upsertedRows += created.count;
    }

    const updateBatchSize = 50;
    for (let index = 0; index < rowsToUpdate.length; index += updateBatchSize) {
      const batch = rowsToUpdate.slice(index, index + updateBatchSize);
      await Promise.all(batch.map((row) => this.prisma.contractPaymentReceipt.update({
        where: {
          sourceId_sourceRecordKey: {
            sourceId,
            sourceRecordKey: row.sourceRecordKey,
          },
        },
        data: row.data,
      })));
      upsertedRows += batch.length;
    }

    await this.recomputePaymentStatuses([...affectedDocumentNumbers], planVersions);

    return {
      fetchedRows: rows.length,
      upsertedRows,
      skippedRows,
      matchedRows,
      reviewRows,
    };
  }

  async recomputePaymentStatuses(documentNumbers?: string[], planVersionsInput?: PlanVersionForPaymentMatch[]) {
    const normalized = documentNumbers?.length
      ? Array.from(new Set(documentNumbers.map(normalizeContractDocumentNumber).filter(isPresent).map(documentNumberBaseKey)))
      : await this.listPaymentStatusDocumentNumbers();
    if (normalized.length === 0) {
      return;
    }

    const planVersions = planVersionsInput ?? await this.prisma.planVersion.findMany({
      select: {
        id: true,
        versionNumber: true,
        plan: {
          select: {
            currentVersionId: true,
            documentNumberBase: true,
          },
        },
        meta: {
          select: {
            documentNumber: true,
            headcountTotal: true,
          },
        },
        pricing: {
          select: {
            depositAmountKrw: true,
            securityDepositAmountKrw: true,
            securityDepositUnitPriceKrw: true,
            securityDepositMode: true,
            inputSnapshot: true,
            manualPricingSnapshot: true,
          },
        },
        confirmedTrips: {
          where: { status: 'ACTIVE' },
          select: { id: true },
          take: 1,
        },
      },
    });
    const receipts = await this.prisma.contractPaymentReceipt.findMany({
      where: contractPaymentReceiptDocumentWhere(normalized),
      select: {
        matchedDocumentNumberNorm: true,
        amountKrw: true,
        needsReviewReason: true,
      },
    });
    const receiptsByDocumentNumber = new Map<string, ContractPaymentReceiptForStatus[]>();
    for (const receipt of receipts) {
      if (!receipt.matchedDocumentNumberNorm) {
        continue;
      }
      const key = documentNumberBaseKey(receipt.matchedDocumentNumberNorm);
      const items = receiptsByDocumentNumber.get(key) ?? [];
      items.push(receipt);
      receiptsByDocumentNumber.set(key, items);
    }

    for (const documentNumberNorm of normalized) {
      const documentNumberBase = documentNumberBaseKey(documentNumberNorm);
      const paymentReceipts = receiptsByDocumentNumber.get(documentNumberBase) ?? [];
      const planVersion = getPaymentPlanVersionForDocument(documentNumberNorm, planVersions);
      const requiredAmountKrw = requiredPaymentAmount(planVersion);
      const receivedAmountKrw = paymentReceipts.reduce((sum, receipt) => sum + (receipt.amountKrw ?? 0), 0);
      const status = paymentStatusForAmounts({
        requiredAmountKrw,
        receivedAmountKrw,
        matchedPlanVersionId: planVersion?.id ?? null,
        hasReviewReceipt: paymentReceipts.some((receipt) => Boolean(receipt.needsReviewReason)),
      });

      await this.prisma.contractPaymentStatus.upsert({
        where: { documentNumberNorm: documentNumberBase },
        create: {
          documentNumberNorm: documentNumberBase,
          requiredAmountKrw,
          receivedAmountKrw,
          status: status.status,
          needsReviewReason: status.reason,
          matchedPlanVersionId: planVersion?.id ?? null,
          computedAt: new Date(),
        },
        update: {
          requiredAmountKrw,
          receivedAmountKrw,
          status: status.status,
          needsReviewReason: status.reason,
          matchedPlanVersionId: planVersion?.id ?? null,
          computedAt: new Date(),
        },
      });
      await this.prisma.contractPaymentStatus.deleteMany({
        where: { documentNumberNorm: { startsWith: `${documentNumberBase}V` } },
      });
    }
  }

  private async listPaymentStatusDocumentNumbers(): Promise<string[]> {
    const [receiptRows, submissionRows] = await Promise.all([
      this.prisma.contractPaymentReceipt.findMany({
        where: { matchedDocumentNumberNorm: { not: null } },
        distinct: ['matchedDocumentNumberNorm'],
        select: { matchedDocumentNumberNorm: true },
      }),
      this.prisma.contractSubmission.findMany({
        where: { documentNumberNorm: { not: null } },
        distinct: ['documentNumberNorm'],
        select: { documentNumberNorm: true },
      }),
    ]);

    return Array.from(new Set([
      ...receiptRows.map((row) => row.matchedDocumentNumberNorm).filter(isPresent),
      ...submissionRows.map((row) => row.documentNumberNorm).filter(isPresent),
    ].map(normalizeContractDocumentNumber).filter(isPresent).map(documentNumberBaseKey)));
  }
}
