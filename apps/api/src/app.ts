import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import express from 'express';
import type { RequestHandler } from 'express';
import { Readable } from 'node:stream';
import { createContext } from './context';
import { toGraphQLErrorExtensions } from './lib/errors';
import type { UploadFile } from './lib/file-storage/client';
import { resolvers } from './resolvers';
import { typeDefs } from './schema';

const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_UPLOAD_FILES = 20;

type JsonObject = Record<string, unknown>;

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

export async function createApp(): Promise<express.Express> {
  const app = express();
  const webOrigin = process.env.WEB_ORIGIN?.trim() || 'http://localhost:5173';

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
    cors({
      origin: (origin, callback) => {
        if (!origin || origin === webOrigin) {
          callback(null, true);
          return;
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
    parseGraphqlMultipartRequest,
    express.json(),
    expressMiddleware(server, {
      context: async ({ req, res }) => createContext({ req, res }),
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
