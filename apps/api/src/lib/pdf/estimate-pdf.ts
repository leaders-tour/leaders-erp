import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { z } from 'zod';
 
const PDF_RENDER_TIMEOUT_MS = 120_000;
const PUPPETEER_PROTOCOL_TIMEOUT_MS = 180_000;
const PDF_RENDER_SESSION_TTL_MS = 5 * 60_000;
const PDF_JOB_RUNNING_TTL_MS = 10 * 60_000;
const PDF_JOB_COMPLETED_TTL_MS = 5 * 60_000;
const DEFAULT_RENDER_BASE_URL = 'http://localhost:5173';
const PUPPETEER_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--no-first-run',
] as const;

const estimateDocumentDataSchema = z.object({
  mode: z.enum(['version', 'draft']),
  isDraft: z.boolean(),
  planTitle: z.string(),
  page2Title: z.string(),
  page3Title: z.string(),
  leaderName: z.string(),
  destinationName: z.string(),
  vehicleType: z.string(),
  pickupText: z.string(),
  dropText: z.string(),
  externalPickupText: z.string(),
  externalDropText: z.string(),
  externalPickupDropText: z.string(),
  specialNoteText: z.string(),
  rentalItemsText: z.string(),
  eventText: z.string(),
  remarkText: z.string(),
  securityDepositScope: z.string(),
  transportGroups: z.array(z.unknown()),
  externalTransfers: z.array(z.unknown()),
  adjustmentLines: z.array(z.unknown()),
  teamPricings: z.array(z.unknown()),
  planStops: z.array(z.unknown()),
  page3Blocks: z.array(z.unknown()),
}).passthrough();

const estimatePdfRequestSchema = z.object({
  data: estimateDocumentDataSchema,
});

interface EstimateRenderSession {
  token: string;
  createdAt: number;
  expiresAt: number;
  data: Record<string, unknown>;
}

interface RenderEstimatePdfInput {
  sessionToken: string;
  renderBaseUrl: string;
  includeStaticImagePages?: boolean;
}

export type EstimatePdfJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

interface EstimatePdfJob {
  id: string;
  status: EstimatePdfJobStatus;
  createdAt: number;
  expiresAt: number;
  filename: string;
  data: Record<string, unknown>;
  pdfBuffer?: Buffer;
  errorMessage?: string;
}

let browserInstancePromise: Promise<Browser> | null = null;
let staticAppendixPdfBytesPromise: Promise<Uint8Array> | null = null;

function logEstimatePdfError(sessionToken: string, message: string, error: unknown): void {
  console.error(`[estimate-pdf:${sessionToken}] ${message}`, error);
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function buildEstimateRenderUrl(input: { renderBaseUrl: string; token: string; includeStaticImagePages?: boolean }): string {
  const url = new URL('/documents/estimate/render', ensureTrailingSlash(input.renderBaseUrl));
  url.searchParams.set('token', input.token);
  if (input.includeStaticImagePages === false) {
    url.searchParams.set('staticPages', 'none');
  }
  return url.toString();
}

function sanitizeFilenameSegment(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ').replace(/[\\/:*?"<>|]+/g, '-');
  return normalized.length > 0 ? normalized : 'estimate';
}

function buildContentFilename(baseName: string): string {
  const safeBaseName = sanitizeFilenameSegment(baseName);
  return safeBaseName.endsWith('.pdf') ? safeBaseName : `${safeBaseName}.pdf`;
}

async function getStaticAppendixPdfBytes(): Promise<Uint8Array> {
  if (!staticAppendixPdfBytesPromise) {
    const candidates = [
      path.resolve(process.cwd(), 'assets/estimate-static-appendix.pdf'),
      path.resolve(process.cwd(), 'apps/api/assets/estimate-static-appendix.pdf'),
    ];

    staticAppendixPdfBytesPromise = (async () => {
      for (const candidate of candidates) {
        try {
          return await readFile(candidate);
        } catch (_error) {
          continue;
        }
      }

      throw new Error('정적 appendix PDF 파일을 찾을 수 없습니다.');
    })().catch((error) => {
      staticAppendixPdfBytesPromise = null;
      throw error;
    });
  }

  return staticAppendixPdfBytesPromise;
}

async function mergeWithStaticAppendixPdf(dynamicPdfBuffer: Buffer): Promise<Buffer> {
  const mergedPdf = await PDFDocument.create();
  const dynamicPdf = await PDFDocument.load(dynamicPdfBuffer);
  const appendixPdf = await PDFDocument.load(await getStaticAppendixPdfBytes());

  const dynamicPages = await mergedPdf.copyPages(dynamicPdf, dynamicPdf.getPageIndices());
  dynamicPages.forEach((page) => {
    mergedPdf.addPage(page);
  });

  const appendixPages = await mergedPdf.copyPages(appendixPdf, appendixPdf.getPageIndices());
  appendixPages.forEach((page) => {
    mergedPdf.addPage(page);
  });

  return Buffer.from(await mergedPdf.save());
}

async function waitForEstimatePageReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const node = document.querySelector('[data-estimate-render-state]');
      const state = node?.getAttribute('data-estimate-render-state');
      return state === 'ready' || state === 'error';
    },
    { timeout: PDF_RENDER_TIMEOUT_MS },
  );

  const renderState = await page.$eval('[data-estimate-render-state]', (element: Element) => ({
    state: element.getAttribute('data-estimate-render-state'),
    errorMessage: element.getAttribute('data-estimate-error-message'),
  }));

  if (renderState.state === 'error') {
    throw new Error(renderState.errorMessage || '견적서 렌더링 중 오류가 발생했습니다.');
  }

  await page.evaluate(async () => {
    if ('fonts' in document && document.fonts?.ready) {
      await document.fonts.ready;
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

async function launchBrowser(): Promise<Browser> {
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: PUPPETEER_PROTOCOL_TIMEOUT_MS,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || undefined,
    args: [...PUPPETEER_LAUNCH_ARGS],
  });

  browser.on('disconnected', () => {
    browserInstancePromise = null;
  });

  return browser;
}

async function getOrLaunchBrowser(): Promise<Browser> {
  if (!browserInstancePromise) {
    browserInstancePromise = launchBrowser().catch((error) => {
      browserInstancePromise = null;
      throw error;
    });
  }

  return browserInstancePromise;
}

async function renderEstimatePdf(input: RenderEstimatePdfInput): Promise<Buffer> {
  const browser = await getOrLaunchBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultTimeout(PDF_RENDER_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(PDF_RENDER_TIMEOUT_MS);
    page.on('pageerror', (error) => {
      logEstimatePdfError(input.sessionToken, 'PDF 렌더 페이지 내부 오류가 발생했습니다.', error);
    });
    page.on('requestfailed', (request) => {
      logEstimatePdfError(
        input.sessionToken,
        `렌더 페이지 요청에 실패했습니다. (${request.method()} ${request.url()} - ${request.failure()?.errorText ?? '원인 미상'})`,
        new Error('렌더 페이지 요청 실패'),
      );
    });

    const url = buildEstimateRenderUrl({
      renderBaseUrl: input.renderBaseUrl,
      token: input.sessionToken,
      includeStaticImagePages: input.includeStaticImagePages,
    });

    await page.setViewport({ width: 1440, height: 2200, deviceScaleFactor: 1 });

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: PDF_RENDER_TIMEOUT_MS,
    });

    await waitForEstimatePageReady(page);
    await page.emulateMediaType('print');

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
    logEstimatePdfError(input.sessionToken, '견적서 PDF 생성 중 오류가 발생했습니다.', error);
    throw error;
  } finally {
    await page.close();
  }
}

const estimateRenderSessions = new Map<string, EstimateRenderSession>();
const estimatePdfJobs = new Map<string, EstimatePdfJob>();

function cleanupExpiredEstimateRenderSessions(): void {
  const now = Date.now();
  for (const [token, session] of estimateRenderSessions.entries()) {
    if (session.expiresAt <= now) {
      estimateRenderSessions.delete(token);
    }
  }
}

function cleanupExpiredEstimatePdfJobs(): void {
  const now = Date.now();
  for (const [jobId, job] of estimatePdfJobs.entries()) {
    if (job.expiresAt <= now) {
      estimatePdfJobs.delete(jobId);
    }
  }
}

function getEstimatePdfJobFilename(data: Record<string, unknown>): string {
  return buildEstimatePdfFilename({
    leaderName: typeof data.leaderName === 'string' ? data.leaderName : null,
    documentNumber: typeof data.documentNumber === 'string' ? data.documentNumber : null,
    isDraft: data.isDraft === true,
  });
}

function toJobErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'PDF 생성에 실패했습니다.';
}

function markEstimatePdfJobComplete(jobId: string, input: { status: 'succeeded'; pdfBuffer: Buffer } | { status: 'failed'; errorMessage: string }): void {
  const job = estimatePdfJobs.get(jobId);
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

async function runEstimatePdfJob(input: { jobId: string; renderBaseUrl: string }): Promise<void> {
  const job = estimatePdfJobs.get(input.jobId);
  if (!job) {
    return;
  }

  job.status = 'running';

  try {
    const pdfBuffer = await renderEstimateDocumentPdf({
      data: job.data,
      renderBaseUrl: input.renderBaseUrl,
    });
    markEstimatePdfJobComplete(input.jobId, {
      status: 'succeeded',
      pdfBuffer,
    });
  } catch (error) {
    const errorMessage = toJobErrorMessage(error);
    markEstimatePdfJobComplete(input.jobId, {
      status: 'failed',
      errorMessage,
    });
    logEstimatePdfError(input.jobId, '비동기 PDF 작업이 실패했습니다.', error);
  }
}

export function getEstimatePdfRenderBaseUrl(fallbackOrigins: readonly string[]): string {
  const configured = process.env.PDF_RENDER_BASE_URL?.trim();
  if (configured) {
    return configured;
  }

  const firstFallbackOrigin = fallbackOrigins[0]?.trim();
  return firstFallbackOrigin && firstFallbackOrigin.length > 0 ? firstFallbackOrigin : DEFAULT_RENDER_BASE_URL;
}

export function parseEstimatePdfRequestBody(body: unknown): {
  data: Record<string, unknown>;
} {
  const parsed = estimatePdfRequestSchema.parse(body);
  return {
    data: parsed.data,
  };
}

export function createEstimateRenderSession(data: Record<string, unknown>): string {
  cleanupExpiredEstimateRenderSessions();
  const now = Date.now();
  const token = randomUUID();

  estimateRenderSessions.set(token, {
    token,
    createdAt: now,
    expiresAt: now + PDF_RENDER_SESSION_TTL_MS,
    data,
  });

  return token;
}

export function getEstimateRenderSession(token: string): EstimateRenderSession | null {
  cleanupExpiredEstimateRenderSessions();
  const session = estimateRenderSessions.get(token);
  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    estimateRenderSessions.delete(token);
    return null;
  }

  return session;
}

export function createEstimatePdfJob(input: {
  data: Record<string, unknown>;
  renderBaseUrl: string;
}): {
  jobId: string;
  status: EstimatePdfJobStatus;
} {
  cleanupExpiredEstimatePdfJobs();

  const now = Date.now();
  const jobId = randomUUID();
  estimatePdfJobs.set(jobId, {
    id: jobId,
    status: 'queued',
    createdAt: now,
    expiresAt: now + PDF_JOB_RUNNING_TTL_MS,
    filename: getEstimatePdfJobFilename(input.data),
    data: input.data,
  });

  void runEstimatePdfJob({
    jobId,
    renderBaseUrl: input.renderBaseUrl,
  });

  return {
    jobId,
    status: 'queued',
  };
}

export function getEstimatePdfJob(jobId: string): {
  jobId: string;
  status: EstimatePdfJobStatus;
  errorMessage?: string;
  filename: string;
  ready: boolean;
} | null {
  cleanupExpiredEstimatePdfJobs();
  const job = estimatePdfJobs.get(jobId);
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

export function consumeEstimatePdfJobResult(jobId: string): {
  filename: string;
  pdfBuffer: Buffer;
} | null {
  cleanupExpiredEstimatePdfJobs();
  const job = estimatePdfJobs.get(jobId);
  if (!job || job.status !== 'succeeded' || !job.pdfBuffer) {
    return null;
  }

  estimatePdfJobs.delete(jobId);

  return {
    filename: job.filename,
    pdfBuffer: job.pdfBuffer,
  };
}

export async function renderEstimateDocumentPdf(input: {
  data: Record<string, unknown>;
  renderBaseUrl: string;
}): Promise<Buffer> {
  const sessionToken = createEstimateRenderSession(input.data);
  try {
    const dynamicPdfBuffer = await renderEstimatePdf({
      sessionToken,
      renderBaseUrl: input.renderBaseUrl,
      includeStaticImagePages: false,
    });
    return await mergeWithStaticAppendixPdf(dynamicPdfBuffer);
  } finally {
    estimateRenderSessions.delete(sessionToken);
  }
}

export function buildContentDisposition(filename: string): string {
  const asciiFallback = filename
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]+/g, '')
    .replace(/"/g, '')
    .trim();
  const safeAsciiFilename = asciiFallback.length > 0 ? asciiFallback : 'estimate.pdf';
  return `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export function buildEstimatePdfFilename(input: {
  leaderName?: string | null;
  documentNumber?: string | null;
  isDraft?: boolean | null;
}): string {
  const leaderName = input.leaderName?.trim() || '고객';
  const documentNumberPart = input.isDraft ? '임시본' : input.documentNumber?.trim() || '문서번호없음';
  return buildContentFilename(`리더스_${leaderName}님_맞춤견적서_${documentNumberPart}`);
}
