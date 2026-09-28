import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const config = {
  port: Number(process.env.PORT) || 3001,
  host: '127.0.0.1',
  /** Должен совпадать с datasource.url в prisma/schema.prisma. */
  dbFile: path.join(ROOT_DIR, 'data', 'ciphers.db'),
  backupDir: path.join(ROOT_DIR, 'backups'),
  /** Сколько последних ежедневных копий хранить. */
  backupsToKeep: 30,
  /** Собранный фронтенд (npm run build); если его нет, сервер отдаёт только API. */
  clientDistDir: path.join(ROOT_DIR, 'client', 'dist'),
};
