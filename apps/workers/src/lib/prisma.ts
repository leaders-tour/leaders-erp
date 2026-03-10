import { PrismaClient } from '@prisma/client';
import { getWorkerEnv } from './env';

getWorkerEnv();

export const prisma = new PrismaClient();
