import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorBody, ApiErrorCode, TagDTO } from '../../shared/types';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly existingTag?: TagDTO,
  ) {
    super(message);
  }
}

export const notFound = (message: string) => new HttpError(404, 'NOT_FOUND', message);
export const badRequest = (message: string) => new HttpError(400, 'VALIDATION', message);

function isBodyParseError(err: unknown): boolean {
  return err instanceof SyntaxError && 'status' in err && err.status === 400;
}

/** Превращает любую ошибку в понятный JSON-ответ без stack trace. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  let body: ApiErrorBody = { error: 'Внутренняя ошибка сервера', code: 'INTERNAL' };

  if (err instanceof HttpError) {
    status = err.status;
    body = { error: err.message, code: err.code, existingTag: err.existingTag };
  } else if (err instanceof ZodError) {
    status = 400;
    body = { error: err.issues[0]?.message ?? 'Некорректные данные', code: 'VALIDATION' };
  } else if (isBodyParseError(err)) {
    status = 400;
    body = { error: 'Некорректный JSON в запросе', code: 'VALIDATION' };
  } else {
    console.error(err);
  }

  res.status(status).json(body);
};
