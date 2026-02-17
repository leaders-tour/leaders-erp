import type { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface AppContext {
  prisma: PrismaClient;
}

export function createContext(): AppContext {
  return { prisma };
}
