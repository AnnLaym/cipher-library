import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { DEFAULT_CIPHER_SORT, formatCipherSort, parseCipherSort, type CipherSort } from '../../../../shared/cipherSort';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const SEARCH_DELAY_MS = 200;

function parseTagIds(raw: string | null): number[] {
  if (!raw) return [];
  const ids = raw
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
}

/**
 * Поиск, выбранные теги и сортировка сохраняются в адресной строке (?q=…&tags=1,2&sort=date-desc)
 * и переживают перезагрузку. Текст поля хранится локально, а в адрес и запрос попадает с небольшой задержкой.
 */
export function useCipherFilters() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(() => params.get('q') ?? '');
  const appliedQuery = useDebouncedValue(query, SEARCH_DELAY_MS).trim();
  const tagParam = params.get('tags');
  const tagIds = useMemo(() => parseTagIds(tagParam), [tagParam]);
  const sortParam = params.get('sort');
  const sort = useMemo(() => parseCipherSort(sortParam), [sortParam]);

  const writeParams = useCallback(
    (next: { q?: string; tagIds?: number[]; sort?: CipherSort }) => {
      setParams(
        (prev) => {
          const result = new URLSearchParams(prev);
          if (next.q !== undefined) {
            if (next.q) result.set('q', next.q);
            else result.delete('q');
          }
          if (next.tagIds !== undefined) {
            if (next.tagIds.length > 0) result.set('tags', next.tagIds.join(','));
            else result.delete('tags');
          }
          if (next.sort !== undefined) {
            const value = formatCipherSort(next.sort);
            if (value !== formatCipherSort(DEFAULT_CIPHER_SORT)) result.set('sort', value);
            else result.delete('sort');
          }
          return result;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const urlQuery = params.get('q') ?? '';
  useEffect(() => {
    if (urlQuery !== appliedQuery) writeParams({ q: appliedQuery });
  }, [urlQuery, appliedQuery, writeParams]);

  return useMemo(
    () => ({
      /** Текст в поле поиска. */
      query,
      /** Текст, по которому уже выполняется поиск. */
      appliedQuery,
      tagIds,
      sort,
      hasFilters: appliedQuery !== '' || tagIds.length > 0,
      setQuery,
      setSort: (next: CipherSort) => writeParams({ sort: next }),
      setTagIds: (ids: number[]) => writeParams({ tagIds: ids }),
      toggleTag: (id: number) =>
        writeParams({ tagIds: tagIds.includes(id) ? tagIds.filter((tagId) => tagId !== id) : [...tagIds, id] }),
      reset: () => {
        setQuery('');
        writeParams({ q: '', tagIds: [] });
      },
    }),
    [query, appliedQuery, tagIds, sort, writeParams],
  );
}
