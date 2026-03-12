import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { EmployeeRole, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

function loadDotEnv(): void {
  const envFilePath = path.resolve(process.cwd(), '.env');
  if (!existsSync(envFilePath)) {
    return;
  }

  const envContent = readFileSync(envFilePath, 'utf8');
  for (const rawLine of envContent.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv: string[]): Record<string, string> {
  const output: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!key || !next || next.startsWith('--')) {
      continue;
    }

    output[key] = next;
    index += 1;
  }

  return output;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

function getInputValue(args: Record<string, string>, key: string, envKey: string): string {
  return args[key]?.trim() || process.env[envKey]?.trim() || '';
}

async function main(): Promise<void> {
  loadDotEnv();

  const args = parseArgs(process.argv.slice(2));
  const name = getInputValue(args, 'name', 'ADMIN_CREATE_NAME') || 'ERP 관리자';
  const email = normalizeEmail(getInputValue(args, 'email', 'ADMIN_CREATE_EMAIL'));
  const password = getInputValue(args, 'password', 'ADMIN_CREATE_PASSWORD');

  if (!email || !password) {
    throw new Error(
      'Missing admin credentials. Use --email/--password or ADMIN_CREATE_EMAIL/ADMIN_CREATE_PASSWORD.',
    );
  }

  const employee = await prisma.employee.upsert({
    where: { email },
    update: {
      name,
      passwordHash: await hashPassword(password),
      role: EmployeeRole.ADMIN,
      isActive: true,
    },
    create: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: EmployeeRole.ADMIN,
      isActive: true,
    },
  });

  await prisma.employeeRefreshToken.updateMany({
    where: {
      employeeId: employee.id,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  process.stdout.write(
    `Admin account is ready.\nemail=${employee.email}\nrole=${employee.role}\nisActive=${String(employee.isActive)}\n`,
  );
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Failed to create admin: ${String(error)}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
