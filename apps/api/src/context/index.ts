import type { EmployeeRole, PrismaClient } from '@prisma/client';
import type { Request, Response } from 'express';
import { getRefreshCookieName, parseCookies, verifyAccessToken } from '../lib/auth';
import { prisma } from '../lib/prisma';

export interface CurrentEmployee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  isActive: boolean;
}

export interface AppContext {
  prisma: PrismaClient;
  req: Request;
  res: Response;
  employee: CurrentEmployee | null;
  refreshToken: string | null;
}

async function resolveCurrentEmployee(req: Request): Promise<CurrentEmployee | null> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const payload = verifyAccessToken(authorization.slice('Bearer '.length));
  if (!payload) {
    return null;
  }

  const employee = await prisma.employee.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!employee || !employee.isActive) {
    return null;
  }

  return employee;
}

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<AppContext> {
  const cookies = parseCookies(req.headers.cookie);

  return {
    prisma,
    req,
    res,
    employee: await resolveCurrentEmployee(req),
    refreshToken: cookies[getRefreshCookieName()] ?? null,
  };
}
