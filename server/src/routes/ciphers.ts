import { Router } from 'express';
import { cipherService } from '../services/cipherService';
import { cipherInputSchema, cipherQuerySchema, parseId } from '../validation';

export const ciphersRouter = Router();

// GET /api/ciphers?q=мар&tags=1,5
ciphersRouter.get('/', async (req, res) => {
  const { q, tags } = cipherQuerySchema.parse(req.query);
  res.json(await cipherService.list(q, tags));
});

ciphersRouter.get('/:id', async (req, res) => {
  res.json(await cipherService.get(parseId(req.params.id)));
});

ciphersRouter.post('/', async (req, res) => {
  const input = cipherInputSchema.parse(req.body ?? {});
  res.status(201).json(await cipherService.create(input));
});

ciphersRouter.put('/:id', async (req, res) => {
  const input = cipherInputSchema.parse(req.body ?? {});
  res.json(await cipherService.update(parseId(req.params.id), input));
});

ciphersRouter.delete('/:id', async (req, res) => {
  await cipherService.remove(parseId(req.params.id));
  res.status(204).end();
});
