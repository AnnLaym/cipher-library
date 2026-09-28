import { Router } from 'express';
import { tagService } from '../services/tagService';
import { parseId, tagInputSchema } from '../validation';

export const tagsRouter = Router();

tagsRouter.get('/', async (_req, res) => {
  res.json(await tagService.list());
});

tagsRouter.post('/', async (req, res) => {
  const input = tagInputSchema.parse(req.body ?? {});
  res.status(201).json(await tagService.create(input));
});

tagsRouter.put('/:id', async (req, res) => {
  const input = tagInputSchema.parse(req.body ?? {});
  res.json(await tagService.update(parseId(req.params.id), input));
});

tagsRouter.delete('/:id', async (req, res) => {
  await tagService.remove(parseId(req.params.id));
  res.status(204).end();
});
