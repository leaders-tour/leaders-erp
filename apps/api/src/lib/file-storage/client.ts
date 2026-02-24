import type { Readable } from 'node:stream';
import { createHash, createHmac } from 'node:crypto';
import { DomainError } from '../errors';

export interface UploadFile {
  filename: string;
  mimetype: string;
  createReadStream: () => Readable;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function sha256Hex(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function toKstYyMmDd(date: Date): string {
  const kstTime = date.getTime() + 9 * 60 * 60 * 1000;
  const kstDate = new Date(kstTime);
  const year = kstDate.getUTCFullYear() % 100;
  const month = kstDate.getUTCMonth() + 1;
  const day = kstDate.getUTCDate();
  return `${String(year).padStart(2, '0')}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

function encodeS3Key(value: string): string {
  return value
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function sanitizeKeyPrefix(value: string): string {
  return value
    .split('/')
    .map((segment) => sanitizeFilename(segment))
    .filter((segment) => segment.length > 0)
    .join('/');
}

function deriveExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex < 0) {
    return '';
  }
  const extension = filename.slice(dotIndex).toLowerCase();
  return extension.length <= 10 ? extension : '';
}

function deriveBaseName(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  const raw = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  const sanitized = sanitizeFilename(raw);
  return sanitized.length > 0 ? sanitized : 'image';
}

async function streamToBuffer(stream: Readable, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of stream) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += part.length;
    if (total > maxBytes) {
      throw new DomainError('VALIDATION_FAILED', `File size exceeds limit (${maxBytes} bytes)`);
    }
    chunks.push(part);
  }

  return Buffer.concat(chunks);
}

export class FileStorageClient {
  private readonly region: string;
  private readonly bucket: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly sessionToken?: string;
  private readonly publicBaseUrl?: string;
  private readonly keyPrefix?: string;
  private readonly timeoutMs: number;

  constructor() {
    this.region = process.env.AWS_REGION ?? '';
    this.bucket = process.env.S3_BUCKET ?? '';
    this.accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? '';
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? '';
    this.sessionToken = process.env.AWS_SESSION_TOKEN;
    this.publicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
    this.keyPrefix = sanitizeKeyPrefix(process.env.S3_KEY_PREFIX ?? '');
    this.timeoutMs = Number(process.env.S3_UPLOAD_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

    if (!this.region || !this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      throw new DomainError(
        'UPLOAD_FAILED',
        'S3 env is not configured (AWS_REGION, S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)',
      );
    }
  }

  async uploadImage(file: UploadFile, maxBytes: number): Promise<string> {
    const rawBuffer = await streamToBuffer(file.createReadStream(), maxBytes);
    const date = new Date();
    const amzDate = toAmzDate(date);
    const shortDate = amzDate.slice(0, 8);
    const kstYyMmDd = toKstYyMmDd(date);
    const extension = deriveExtension(file.filename);
    const key = this.keyPrefix
      ? `${this.keyPrefix}/${kstYyMmDd}/${deriveBaseName(file.filename)}${extension}`
      : `${kstYyMmDd}/${deriveBaseName(file.filename)}${extension}`;
    const encodedKey = encodeS3Key(key);
    const host = `${this.bucket}.s3.${this.region}.amazonaws.com`;
    const endpoint = `https://${host}/${encodedKey}`;

    const payloadHash = sha256Hex(rawBuffer);
    const canonicalHeadersLines = [`content-type:${file.mimetype}`, `host:${host}`, `x-amz-content-sha256:${payloadHash}`, `x-amz-date:${amzDate}`];
    const signedHeaderKeys = ['content-type', 'host', 'x-amz-content-sha256', 'x-amz-date'];

    if (this.sessionToken) {
      canonicalHeadersLines.push(`x-amz-security-token:${this.sessionToken}`);
      signedHeaderKeys.push('x-amz-security-token');
    }

    const canonicalHeaders = `${canonicalHeadersLines.join('\n')}\n`;
    const signedHeaders = signedHeaderKeys.join(';');
    const canonicalRequest = ['PUT', `/${encodedKey}`, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const credentialScope = `${shortDate}/${this.region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');

    const kDate = hmac(`AWS4${this.secretAccessKey}`, shortDate);
    const kRegion = hmac(kDate, this.region);
    const kService = hmac(kRegion, 's3');
    const signingKey = hmac(kService, 'aws4_request');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        'content-type': file.mimetype,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        Authorization: authorization,
      };
      if (this.sessionToken) {
        headers['x-amz-security-token'] = this.sessionToken;
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        body: new Uint8Array(rawBuffer),
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new DomainError('UPLOAD_FAILED', `S3 upload failed with status ${response.status}`);
      }

      if (this.publicBaseUrl) {
        return `${stripTrailingSlash(this.publicBaseUrl)}/${encodedKey}`;
      }
      return endpoint;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new DomainError('UPLOAD_FAILED', 'Failed to upload image to S3');
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}
