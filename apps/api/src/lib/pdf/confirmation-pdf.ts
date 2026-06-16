import { randomUUID } from 'node:crypto';
import type { Page } from 'puppeteer';
import { z } from 'zod';
import { confirmationDocumentSnapshotSchema } from '@tour/validation';
import {
  buildContentDisposition,
  getEstimatePdfRenderBaseUrl,
  getOrLaunchBrowser,
} from './estimate-pdf';

const PDF_RENDER_TIMEOUT_MS = 120_000;

const confirmationPdfRequestSchema = z.object({
  snapshot: confirmationDocumentSnapshotSchema,
  appendixData: z.record(z.string(), z.unknown()).nullable().optional(),
  isDraft: z.boolean().optional(),
});

interface ConfirmationRenderSession {
  token: string;
  createdAt: number;
  expiresAt: number;
  data: Record<string, unknown>;
}

export type ConfirmationPdfJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

interface ConfirmationPdfJob {
  id: string;
  status: ConfirmationPdfJobStatus;
  createdAt: number;
  expiresAt: number;
  filename: string;
  data: Record<string, unknown>;
  pdfBuffer?: Buffer;
  errorMessage?: string;
}

const PDF_RENDER_SESSION_TTL_MS = 5 * 60_000;
const PDF_JOB_RUNNING_TTL_MS = 10 * 60_000;
const PDF_JOB_COMPLETED_TTL_MS = 5 * 60_000;

const confirmationRenderSessions = new Map<string, ConfirmationRenderSession>();
const confirmationPdfJobs = new Map<string, ConfirmationPdfJob>();

function logConfirmationPdfError(sessionToken: string, message: string, error: unknown): void {
  console.error(`[confirmation-pdf:${sessionToken}] ${message}`, error);
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function buildConfirmationRenderUrl(input: { renderBaseUrl: string; token: string }): string {
  const url = new URL('/documents/confirmation/render', ensureTrailingSlash(input.renderBaseUrl));
  url.searchParams.set('token', input.token);
  return url.toString();
}

function sanitizeFilenameSegment(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ').replace(/[\\/:*?"<>|]+/g, '-');
  return normalized.length > 0 ? normalized : 'confirmation';
}

function buildContentFilename(baseName: string): string {
  const safeBaseName = sanitizeFilenameSegment(baseName);
  return safeBaseName.endsWith('.pdf') ? safeBaseName : `${safeBaseName}.pdf`;
}

function cleanupExpiredConfirmationRenderSessions(): void {
  const now = Date.now();
  for (const [token, session] of confirmationRenderSessions.entries()) {
    if (session.expiresAt <= now) {
      confirmationRenderSessions.delete(token);
    }
  }
}

function cleanupExpiredConfirmationPdfJobs(): void {
  const now = Date.now();
  for (const [jobId, job] of confirmationPdfJobs.entries()) {
    if (job.expiresAt <= now) {
      confirmationPdfJobs.delete(jobId);
    }
  }
}

function getConfirmationPdfJobFilename(data: Record<string, unknown>): string {
  const snapshot = data.snapshot;
  const leaderName =
    snapshot && typeof snapshot === 'object' && 'leaderName' in snapshot && typeof snapshot.leaderName === 'string'
      ? snapshot.leaderName
      : null;
  const documentNumber =
    snapshot && typeof snapshot === 'object' && 'documentNumber' in snapshot && typeof snapshot.documentNumber === 'string'
      ? snapshot.documentNumber
      : null;

  return buildConfirmationPdfFilename({
    leaderName,
    documentNumber,
    isDraft: data.isDraft === true,
  });
}

function toJobErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'PDF 생성에 실패했습니다.';
}

function markConfirmationPdfJobComplete(
  jobId: string,
  input: { status: 'succeeded'; pdfBuffer: Buffer } | { status: 'failed'; errorMessage: string },
): void {
  const job = confirmationPdfJobs.get(jobId);
  if (!job) {
    return;
  }

  job.status = input.status;
  job.expiresAt = Date.now() + PDF_JOB_COMPLETED_TTL_MS;

  if (input.status === 'succeeded') {
    job.pdfBuffer = input.pdfBuffer;
    delete job.errorMessage;
    return;
  }

  delete job.pdfBuffer;
  job.errorMessage = input.errorMessage;
}

async function waitForConfirmationPageReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const node = document.querySelector('[data-confirmation-render-state]');
      const state = node?.getAttribute('data-confirmation-render-state');
      return state === 'ready' || state === 'error';
    },
    { timeout: PDF_RENDER_TIMEOUT_MS },
  );

  const renderState = await page.$eval('[data-confirmation-render-state]', (element: Element) => ({
    state: element.getAttribute('data-confirmation-render-state'),
    errorMessage: element.getAttribute('data-confirmation-error-message'),
  }));

  if (renderState.state === 'error') {
    throw new Error(renderState.errorMessage || '확정서 렌더링 중 오류가 발생했습니다.');
  }

  await page.emulateMediaType('print');

  await page.evaluate(async () => {
    if ('fonts' in document && document.fonts?.ready) {
      await document.fonts.ready;
    }

    const images = Array.from(
      document.querySelectorAll('.confirmation-document img, .estimate-document img'),
    ) as HTMLImageElement[];
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }

            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
          }),
      ),
    );

    window.dispatchEvent(new Event('resize'));

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  });

  await page.waitForFunction(
    () => document.querySelector('[data-confirmation-layout-ready="true"]') != null,
    { timeout: PDF_RENDER_TIMEOUT_MS },
  );
}

async function renderConfirmationPdf(input: { sessionToken: string; renderBaseUrl: string }): Promise<Buffer> {
  const browser = await getOrLaunchBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultTimeout(PDF_RENDER_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(PDF_RENDER_TIMEOUT_MS);
    page.on('pageerror', (error) => {
      logConfirmationPdfError(input.sessionToken, 'PDF 렌더 페이지 내부 오류가 발생했습니다.', error);
    });

    const url = buildConfirmationRenderUrl({
      renderBaseUrl: input.renderBaseUrl,
      token: input.sessionToken,
    });

    await page.setViewport({ width: 1440, height: 2200, deviceScaleFactor: 1 });

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: PDF_RENDER_TIMEOUT_MS,
    });

    await waitForConfirmationPageReady(page);

    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      timeout: PDF_RENDER_TIMEOUT_MS,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    });

    return Buffer.from(pdf);
  } catch (error) {
    logConfirmationPdfError(input.sessionToken, '확정서 PDF 생성 중 오류가 발생했습니다.', error);
    throw error;
  } finally {
    await page.close();
  }
}

async function runConfirmationPdfJob(input: { jobId: string; renderBaseUrl: string }): Promise<void> {
  const job = confirmationPdfJobs.get(input.jobId);
  if (!job) {
    return;
  }

  job.status = 'running';

  try {
    const pdfBuffer = await renderConfirmationDocumentPdf({
      data: job.data,
      renderBaseUrl: input.renderBaseUrl,
    });
    markConfirmationPdfJobComplete(input.jobId, {
      status: 'succeeded',
      pdfBuffer,
    });
  } catch (error) {
    const errorMessage = toJobErrorMessage(error);
    markConfirmationPdfJobComplete(input.jobId, {
      status: 'failed',
      errorMessage,
    });
    logConfirmationPdfError(input.jobId, '비동기 PDF 작업이 실패했습니다.', error);
  }
}

export function parseConfirmationPdfRequestBody(body: unknown): {
  snapshot: z.infer<typeof confirmationDocumentSnapshotSchema>;
  appendixData: Record<string, unknown> | null;
  isDraft?: boolean;
} {
  const parsed = confirmationPdfRequestSchema.parse(body);
  return {
    snapshot: parsed.snapshot,
    appendixData: parsed.appendixData ?? null,
    isDraft: parsed.isDraft,
  };
}

export function createConfirmationRenderSession(data: Record<string, unknown>): string {
  cleanupExpiredConfirmationRenderSessions();
  const now = Date.now();
  const token = randomUUID();

  confirmationRenderSessions.set(token, {
    token,
    createdAt: now,
    expiresAt: now + PDF_RENDER_SESSION_TTL_MS,
    data,
  });

  return token;
}

export function getConfirmationRenderSession(token: string): ConfirmationRenderSession | null {
  cleanupExpiredConfirmationRenderSessions();
  const session = confirmationRenderSessions.get(token);
  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    confirmationRenderSessions.delete(token);
    return null;
  }

  return session;
}

export function createConfirmationPdfJob(input: {
  data: Record<string, unknown>;
  renderBaseUrl: string;
}): {
  jobId: string;
  status: ConfirmationPdfJobStatus;
} {
  cleanupExpiredConfirmationPdfJobs();

  const now = Date.now();
  const jobId = randomUUID();
  confirmationPdfJobs.set(jobId, {
    id: jobId,
    status: 'queued',
    createdAt: now,
    expiresAt: now + PDF_JOB_RUNNING_TTL_MS,
    filename: getConfirmationPdfJobFilename(input.data),
    data: input.data,
  });

  void runConfirmationPdfJob({
    jobId,
    renderBaseUrl: input.renderBaseUrl,
  });

  return {
    jobId,
    status: 'queued',
  };
}

export function getConfirmationPdfJob(jobId: string): {
  jobId: string;
  status: ConfirmationPdfJobStatus;
  errorMessage?: string;
  filename: string;
  ready: boolean;
} | null {
  cleanupExpiredConfirmationPdfJobs();
  const job = confirmationPdfJobs.get(jobId);
  if (!job) {
    return null;
  }

  return {
    jobId: job.id,
    status: job.status,
    errorMessage: job.errorMessage,
    filename: job.filename,
    ready: job.status === 'succeeded',
  };
}

export function consumeConfirmationPdfJobResult(jobId: string): {
  filename: string;
  pdfBuffer: Buffer;
} | null {
  cleanupExpiredConfirmationPdfJobs();
  const job = confirmationPdfJobs.get(jobId);
  if (!job || job.status !== 'succeeded' || !job.pdfBuffer) {
    return null;
  }

  confirmationPdfJobs.delete(jobId);

  return {
    filename: job.filename,
    pdfBuffer: job.pdfBuffer,
  };
}

export async function renderConfirmationDocumentPdf(input: {
  data: Record<string, unknown>;
  renderBaseUrl: string;
}): Promise<Buffer> {
  const sessionToken = createConfirmationRenderSession(input.data);
  try {
    return await renderConfirmationPdf({
      sessionToken,
      renderBaseUrl: input.renderBaseUrl,
    });
  } finally {
    confirmationRenderSessions.delete(sessionToken);
  }
}

export function buildConfirmationPdfFilename(input: {
  leaderName?: string | null;
  documentNumber?: string | null;
  isDraft?: boolean | null;
}): string {
  const leaderName = input.leaderName?.trim() || '고객';
  const documentNumberPart = input.isDraft ? '임시본' : input.documentNumber?.trim() || '문서번호없음';
  return buildContentFilename(`리더스_${leaderName}님_여정확정서_${documentNumberPart}`);
}

export { buildContentDisposition, getEstimatePdfRenderBaseUrl as getConfirmationPdfRenderBaseUrl };
