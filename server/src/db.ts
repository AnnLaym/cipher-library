import { PrismaClient } from '@prisma/client';
import { config } from './config';

export const prisma = new PrismaClient({
  datasources: { db: { url: `file:${config.dbFile}` } },
});

export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
