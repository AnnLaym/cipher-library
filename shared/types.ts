// Типы, общие для клиента и сервера (формат REST API).

export interface TagDTO {
  id: number;
  name: string;
  color: string;
  parentId: number | null;
  /** Сколько шифров используют этот тег напрямую. */
  cipherCount: number;
}

export interface CipherTagDTO {
  id: number;
  name: string;
  color: string;
}

export interface CipherDTO {
  id: number;
  word: string;
  description: string;
  /** Только непосредственно назначенные теги, в сохранённом порядке. */
  tags: CipherTagDTO[];
  createdAt: string;
  updatedAt: string;
}

/** Существующий тег передаётся по id, новый — по названию (сервер создаст его или найдёт уже существующий). */
export type CipherTagInput = { id: number } | { name: string };

export interface CipherInput {
  word: string;
  description: string;
  tags: CipherTagInput[];
}

export interface TagInput {
  name: string;
  color: string;
  parentId: number | null;
}

export type ApiErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'TAG_EXISTS' | 'TAG_CYCLE' | 'INTERNAL';

export interface ApiErrorBody {
  error: string;
  code: ApiErrorCode;
  /** Для TAG_EXISTS — тег, который уже существует. */
  existingTag?: TagDTO;
}
