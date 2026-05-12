import { PrismaClient } from '@prisma/client';
import { loadWorkspaceEnv } from './load-workspace-env';

loadWorkspaceEnv();

export const prisma = new PrismaClient();
