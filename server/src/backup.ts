import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from './config';
import { prisma } from './db';

function localDate(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function exists(file: string): Promise<boolean> {
  return fs.access(file).then(
    () => true,
    () => false,
  );
}

/** Оставляет только config.backupsToKeep самых свежих копий. */
async function pruneOldBackups(): Promise<void> {
  const files = (await fs.readdir(config.backupDir))
    .filter((name) => /^backup-\d{4}-\d{2}-\d{2}\.sqlite$/.test(name))
    .sort();
  const outdated = files.slice(0, Math.max(0, files.length - config.backupsToKeep));
  await Promise.all(outdated.map((name) => fs.rm(path.join(config.backupDir, name))));
}

/**
 * Одна копия базы в день: backups/backup-YYYY-MM-DD.sqlite.
 * VACUUM INTO делает согласованный снимок даже при открытом соединении.
 */
export async function ensureDailyBackup(): Promise<void> {
  try {
    if (!(await exists(config.dbFile))) return;
    await fs.mkdir(config.backupDir, { recursive: true });
    const target = path.join(config.backupDir, `backup-${localDate()}.sqlite`);
    if (await exists(target)) return;

    await prisma.$executeRawUnsafe(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
    await pruneOldBackups();
    console.log(`Резервная копия базы: ${target}`);
  } catch (error) {
    console.error('Не удалось создать резервную копию базы:', error);
  }
}
