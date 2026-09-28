import { createApp } from './app';
import { ensureDailyBackup } from './backup';
import { config } from './config';
import { prisma } from './db';

const HOUR = 60 * 60 * 1000;

await ensureDailyBackup();
// Если приложение работает несколько дней без перезапуска — копия всё равно появится каждый день.
setInterval(ensureDailyBackup, HOUR).unref();

const server = createApp().listen(config.port, config.host, () => {
  console.log(`Сервер: http://${config.host}:${config.port}`);
});

async function shutdown(): Promise<void> {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
