// Сортировка списка шифров. Выполняется сервером; клиент хранит выбранный вариант в адресе (?sort=date-desc).

export type CipherSortField = 'date' | 'name' | 'tags';
export type SortDirection = 'asc' | 'desc';

export interface CipherSort {
  field: CipherSortField;
  direction: SortDirection;
}

export const DEFAULT_CIPHER_SORT: CipherSort = { field: 'name', direction: 'asc' };

/** Направление, с которого начинается каждый вид сортировки. */
export const DEFAULT_DIRECTION: Record<CipherSortField, SortDirection> = { date: 'desc', name: 'asc', tags: 'desc' };

const FIELDS: readonly CipherSortField[] = ['date', 'name', 'tags'];

export function formatCipherSort({ field, direction }: CipherSort): string {
  return `${field}-${direction}`;
}

/** «date-desc» → { field: 'date', direction: 'desc' }; всё непонятное — сортировка по умолчанию. */
export function parseCipherSort(raw: string | null | undefined): CipherSort {
  const [field, direction] = (raw ?? '').split('-');
  if (FIELDS.includes(field as CipherSortField) && (direction === 'asc' || direction === 'desc')) {
    return { field: field as CipherSortField, direction };
  }
  return DEFAULT_CIPHER_SORT;
}

interface SortableCipher {
  id: number;
  word: string;
  createdAt: string;
  /** Только непосредственно назначенные теги — унаследованные родители не считаются. */
  tags: readonly unknown[];
}

const alphabetical = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });

const byField: Record<CipherSortField, (a: SortableCipher, b: SortableCipher) => number> = {
  date: (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  name: (a, b) => alphabetical.compare(a.word, b.word),
  tags: (a, b) => a.tags.length - b.tags.length,
};

/** Сравнение по выбранному полю; при равенстве — по алфавиту. */
export function compareCiphers({ field, direction }: CipherSort) {
  const sign = direction === 'asc' ? 1 : -1;
  return (a: SortableCipher, b: SortableCipher): number =>
    sign * byField[field](a, b) || alphabetical.compare(a.word, b.word) || a.id - b.id;
}
