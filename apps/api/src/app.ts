import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import express from 'express';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Readable } from 'node:stream';
import { createContext } from './context';
import {
  buildContentDisposition,
  buildEstimatePdfFilename,
  consumeEstimatePdfJobResult,
  createEstimatePdfJob,
  getEstimatePdfJob,
  getEstimateRenderSession,
  getEstimatePdfRenderBaseUrl,
  parseEstimatePdfRequestBody,
  renderEstimateDocumentPdf,
} from './lib/pdf/estimate-pdf';
import { toGraphQLErrorExtensions } from './lib/errors';
import type { UploadFile } from './lib/file-storage/client';
import { resolvers } from './resolvers';
import { typeDefs } from './schema';

const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_UPLOAD_FILES = 20;
const DEFAULT_WEB_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

type JsonObject = Record<string, unknown>;

function getAllowedWebOrigins(): string[] {
  const configured = process.env.WEB_ORIGIN?.trim();
  if (!configured) {
    return DEFAULT_WEB_ORIGINS;
  }

  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function createCorsMiddleware(allowedWebOrigins: ReadonlySet<string>) {
  return cors({
    origin: (origin, callback) => {
      if (!origin || allowedWebOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    exposedHeaders: ['content-disposition'],
  });
}

function setValueByPath(target: JsonObject, path: string, value: unknown) {
  const segments = path.split('.');
  let cursor: unknown = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === undefined) {
      return;
    }
    const isLast = index === segments.length - 1;
    const numeric = Number(segment);
    const key: string | number = Number.isNaN(numeric) ? segment : numeric;

    if (isLast) {
      if (Array.isArray(cursor) && typeof key === 'number') {
        cursor[key] = value;
      } else if (cursor && typeof cursor === 'object' && typeof key === 'string') {
        (cursor as JsonObject)[key] = value;
      }
      return;
    }

    if (Array.isArray(cursor) && typeof key === 'number') {
      cursor = cursor[key] as unknown;
    } else if (cursor && typeof cursor === 'object' && typeof key === 'string') {
      cursor = (cursor as JsonObject)[key];
    } else {
      return;
    }
  }
}

function toUploadFile(file: File): UploadFile {
  return {
    filename: file.name,
    mimetype: file.type,
    createReadStream: () =>
      Readable.fromWeb(
        file.stream() as unknown as import('node:stream/web').ReadableStream,
      ) as Readable,
  };
}

const parseGraphqlMultipartRequest: RequestHandler = async (req, _res, next) => {
  if (!req.is('multipart/form-data')) {
    next();
    return;
  }

  try {
    const request = new Request('http://localhost/graphql', {
      method: req.method,
      headers: req.headers as HeadersInit,
      body: Readable.toWeb(req) as unknown as BodyInit,
      duplex: 'half',
    } as RequestInit);
    const formData = await request.formData();
    const operationsRaw = formData.get('operations');
    const mapRaw = formData.get('map');

    if (typeof operationsRaw !== 'string' || typeof mapRaw !== 'string') {
      throw new Error('Invalid multipart request');
    }

    const operations = JSON.parse(operationsRaw) as JsonObject;
    const fileMap = JSON.parse(mapRaw) as Record<string, string[]>;

    const allMapEntries = Object.entries(fileMap);
    if (allMapEntries.length > MAX_UPLOAD_FILES) {
      throw new Error(`Too many files. Max allowed: ${MAX_UPLOAD_FILES}`);
    }

    for (const [fileKey, paths] of allMapEntries) {
      const entry = formData.get(fileKey);
      if (!(entry instanceof File)) {
        throw new Error('Invalid upload file');
      }
      if (entry.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
        throw new Error(`File size exceeds limit (${MAX_UPLOAD_FILE_SIZE_BYTES} bytes)`);
      }

      const upload = Promise.resolve(toUploadFile(entry));
      for (const path of paths) {
        setValueByPath(operations, path, upload);
      }
    }

    req.body = operations;
    next();
  } catch (error) {
    next(error);
  }
};

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  console.error(`[api] ${req.method} ${req.originalUrl} 요청 처리 중 오류가 발생했습니다.`, error);

  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    message: error instanceof Error ? error.message : '서버 내부 오류가 발생했습니다.',
  });
};

export async function createApp(): Promise<express.Express> {
  const app = express();
  const allowedWebOrigins = new Set(getAllowedWebOrigins());
  const corsMiddleware = createCorsMiddleware(allowedWebOrigins);
  const estimatePdfRenderBaseUrl = getEstimatePdfRenderBaseUrl([...allowedWebOrigins]);

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: (formattedError, error) => {
      const originalError =
        typeof error === 'object' && error !== null && 'originalError' in error
          ? (error as { originalError?: unknown }).originalError
          : undefined;
      const extensions = toGraphQLErrorExtensions(originalError);
      return {
        ...formattedError,
        extensions: {
          ...formattedError.extensions,
          ...extensions,
        },
      };
    },
  });

  await server.start(); // start

  app.use(
    '/graphql',
    corsMiddleware,
    parseGraphqlMultipartRequest,
    express.json(),
    expressMiddleware(server, {
      context: async ({ req, res }) => createContext({ req, res }),
    }),
  );

  app.options('/api/pdf-proxy', corsMiddleware);
  app.get('/api/pdf-proxy', corsMiddleware, async (req, res, next) => {
    try {
      const rawUrl = typeof req.query['url'] === 'string' ? req.query['url'] : '';
      if (!rawUrl) {
        res.status(400).json({ message: 'url 파라미터가 필요합니다.' });
        return;
      }

      let parsed: URL;
      try {
        parsed = new URL(rawUrl);
      } catch {
        res.status(400).json({ message: '유효하지 않은 URL입니다.' });
        return;
      }

      const s3Bucket = process.env.S3_BUCKET ?? '';
      const s3Region = process.env.AWS_REGION ?? '';
      const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL ?? '';
      const allowedHosts = [
        `${s3Bucket}.s3.${s3Region}.amazonaws.com`,
        `${s3Bucket}.s3.amazonaws.com`,
        publicBaseUrl ? new URL(publicBaseUrl).hostname : '',
      ].filter(Boolean);

      if (!allowedHosts.includes(parsed.hostname)) {
        res.status(403).json({ message: '허용되지 않은 도메인입니다.' });
        return;
      }

      const upstream = await fetch(rawUrl);
      if (!upstream.ok) {
        res.status(502).json({ message: `업스트림 오류: ${upstream.status}` });
        return;
      }

      const contentType = upstream.headers.get('content-type') ?? 'application/pdf';
      res.setHeader('content-type', contentType);
      res.setHeader('cache-control', 'public, max-age=3600');

      const buffer = await upstream.arrayBuffer();
      res.status(200).send(Buffer.from(buffer));
    } catch (error) {
      next(error);
    }
  });

  app.options('/documents/estimate/pdf', corsMiddleware);
  app.options('/documents/estimate/pdf-jobs', corsMiddleware);
  app.options('/documents/estimate/pdf-jobs/:jobId', corsMiddleware);
  app.options('/documents/estimate/pdf-jobs/:jobId/download', corsMiddleware);
  app.options('/documents/estimate/render-sessions/:token', corsMiddleware);

  app.post('/documents/estimate/pdf', corsMiddleware, express.json({ limit: '5mb' }), async (req, res, next) => {
    try {
      const context = await createContext({ req, res });
      if (!context.employee) {
        res.status(401).json({ message: '인증이 필요합니다.' });
        return;
      }

      const request = parseEstimatePdfRequestBody(req.body);
      const pdfBuffer = await renderEstimateDocumentPdf({
        data: request.data,
        renderBaseUrl: estimatePdfRenderBaseUrl,
      });
      const filename = buildEstimatePdfFilename({
        leaderName: typeof request.data.leaderName === 'string' ? request.data.leaderName : null,
        documentNumber: typeof request.data.documentNumber === 'string' ? request.data.documentNumber : null,
        isDraft: request.data.isDraft === true,
      });

      res.setHeader('content-type', 'application/pdf');
      res.setHeader('content-disposition', buildContentDisposition(filename));
      res.setHeader('content-length', String(pdfBuffer.length));
      res.status(200).send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  });

  app.post('/documents/estimate/pdf-jobs', corsMiddleware, express.json({ limit: '5mb' }), async (req, res, next) => {
    try {
      const context = await createContext({ req, res });
      if (!context.employee) {
        res.status(401).json({ message: '인증이 필요합니다.' });
        return;
      }

      const request = parseEstimatePdfRequestBody(req.body);
      const job = createEstimatePdfJob({
        data: request.data,
        renderBaseUrl: estimatePdfRenderBaseUrl,
      });

      res.status(202).json(job);
    } catch (error) {
      next(error);
    }
  });

  app.get('/documents/estimate/pdf-jobs/:jobId', corsMiddleware, async (req, res, next) => {
    try {
      const context = await createContext({ req, res });
      if (!context.employee) {
        res.status(401).json({ message: '인증이 필요합니다.' });
        return;
      }

      const jobId = req.params.jobId?.trim();
      if (!jobId) {
        res.status(400).json({ message: 'jobId가 필요합니다.' });
        return;
      }

      const job = getEstimatePdfJob(jobId);
      if (!job) {
        res.status(404).json({ message: 'PDF 생성 작업을 찾을 수 없거나 만료되었습니다.' });
        return;
      }

      res.status(200).json(job);
    } catch (error) {
      next(error);
    }
  });

  app.get('/documents/estimate/pdf-jobs/:jobId/download', corsMiddleware, async (req, res, next) => {
    try {
      const context = await createContext({ req, res });
      if (!context.employee) {
        res.status(401).json({ message: '인증이 필요합니다.' });
        return;
      }

      const jobId = req.params.jobId?.trim();
      if (!jobId) {
        res.status(400).json({ message: 'jobId가 필요합니다.' });
        return;
      }

      const job = getEstimatePdfJob(jobId);
      if (!job) {
        res.status(404).json({ message: 'PDF 생성 작업을 찾을 수 없거나 만료되었습니다.' });
        return;
      }

      if (job.status === 'failed') {
        res.status(409).json({ message: job.errorMessage || 'PDF 생성에 실패했습니다.' });
        return;
      }

      if (job.status !== 'succeeded') {
        res.status(409).json({ message: 'PDF 생성이 아직 완료되지 않았습니다.' });
        return;
      }

      const result = consumeEstimatePdfJobResult(jobId);
      if (!result) {
        res.status(404).json({ message: 'PDF 생성 결과를 찾을 수 없거나 이미 다운로드되었습니다.' });
        return;
      }

      res.setHeader('content-type', 'application/pdf');
      res.setHeader('content-disposition', buildContentDisposition(result.filename));
      res.setHeader('content-length', String(result.pdfBuffer.length));
      res.status(200).send(result.pdfBuffer);
    } catch (error) {
      next(error);
    }
  });

  app.get('/documents/estimate/render-sessions/:token', corsMiddleware, (req, res) => {
    const token = req.params.token?.trim();
    if (!token) {
      res.status(400).json({ message: 'render token이 필요합니다.' });
      return;
    }

    const session = getEstimateRenderSession(token);
    if (!session) {
      res.status(404).json({ message: '렌더 세션이 만료되었거나 존재하지 않습니다.' });
      return;
    }

    res.status(200).json({
      data: session.data,
    });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(errorHandler);

  return app;
}
