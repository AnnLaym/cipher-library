import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { config } from './config';
import { HttpError, errorHandler } from './errors';
import { ciphersRouter } from './routes/ciphers';
import { tagsRouter } from './routes/tags';

export function createApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/ciphers', ciphersRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api', () => {
    throw new HttpError(404, 'NOT_FOUND', 'Такого адреса API нет');
  });

  // После `npm run build` сервер сам отдаёт интерфейс (режим `npm start`).
  const indexHtml = path.join(config.clientDistDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(config.clientDistDir));
    app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(indexHtml) : next()));
  }

  app.use(errorHandler);
  return app;
}
