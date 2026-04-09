import { randomUUID } from 'node:crypto';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { z } from 'zod';
 
const PDF_RENDER_TIMEOUT_MS = 120_000;
const PUPPETEER_PROTOCOL_TIMEOUT_MS = 180_000;
const PDF_RENDER_SESSION_TTL_MS = 5 * 60_000;
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
}

let browserInstancePromise: Promise<Browser> | null = null;

function logEstimatePdf(sessionToken: string, message: string, extra?: unknown): void {
  if (extra === undefined) {
    console.log(`[estimate-pdf:${sessionToken}] ${message}`);
    return;
  }
  console.log(`[estimate-pdf:${sessionToken}] ${message}`, extra);
}

function logEstimatePdfError(sessionToken: string, message: string, error: unknown): void {
  console.error(`[estimate-pdf:${sessionToken}] ${message}`, error);
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function buildEstimateRenderUrl(input: { renderBaseUrl: string; token: string }): string {
  const url = new URL('/documents/estimate/render', ensureTrailingSlash(input.renderBaseUrl));
  url.searchParams.set('token', input.token);
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
  console.log('[estimate-pdf] launching browser');
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: PUPPETEER_PROTOCOL_TIMEOUT_MS,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH?.trim() || undefined,
    args: [...PUPPETEER_LAUNCH_ARGS],
  });

  browser.on('disconnected', () => {
    console.warn('[estimate-pdf] browser disconnected');
    browserInstancePromise = null;
  });

  console.log('[estimate-pdf] browser launched');
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
  logEstimatePdf(input.sessionToken, 'starting PDF render', { renderBaseUrl: input.renderBaseUrl });
  const browser = await getOrLaunchBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultTimeout(PDF_RENDER_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(PDF_RENDER_TIMEOUT_MS);
    page.on('console', (message) => {
      console.log(`[estimate-pdf:${input.sessionToken}] page console ${message.type()}: ${message.text()}`);
    });
    page.on('pageerror', (error) => {
      logEstimatePdfError(input.sessionToken, 'page error', error);
    });
    page.on('requestfailed', (request) => {
      console.warn(
        `[estimate-pdf:${input.sessionToken}] request failed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? 'unknown'}`,
      );
    });

    const url = buildEstimateRenderUrl({
      renderBaseUrl: input.renderBaseUrl,
      token: input.sessionToken,
    });

    logEstimatePdf(input.sessionToken, 'navigating to render page', { url });
    await page.setViewport({ width: 1440, height: 2200, deviceScaleFactor: 1 });

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: PDF_RENDER_TIMEOUT_MS,
    });
    logEstimatePdf(input.sessionToken, 'render page loaded');

    logEstimatePdf(input.sessionToken, 'waiting for render readiness');
    await waitForEstimatePageReady(page);
    logEstimatePdf(input.sessionToken, 'render readiness confirmed');
    await page.emulateMediaType('print');

    logEstimatePdf(input.sessionToken, 'starting page.pdf');
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

    logEstimatePdf(input.sessionToken, 'page.pdf completed', { bytes: pdf.length });
    return Buffer.from(pdf);
  } catch (error) {
    logEstimatePdfError(input.sessionToken, 'PDF render failed', error);
    throw error;
  } finally {
    logEstimatePdf(input.sessionToken, 'closing page');
    await page.close();
  }
}

const estimateRenderSessions = new Map<string, EstimateRenderSession>();

function cleanupExpiredEstimateRenderSessions(): void {
  const now = Date.now();
  for (const [token, session] of estimateRenderSessions.entries()) {
    if (session.expiresAt <= now) {
      estimateRenderSessions.delete(token);
    }
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

export async function renderEstimateDocumentPdf(input: {
  data: Record<string, unknown>;
  renderBaseUrl: string;
}): Promise<Buffer> {
  const sessionToken = createEstimateRenderSession(input.data);
  try {
    logEstimatePdf(sessionToken, 'created render session');
    return await renderEstimatePdf({
      sessionToken,
      renderBaseUrl: input.renderBaseUrl,
    });
  } finally {
    logEstimatePdf(sessionToken, 'deleting render session');
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
