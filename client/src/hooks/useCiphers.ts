import { useCallback, useEffect, useState } from 'react';
import type { CipherDTO } from '../../../shared/types';
import { ciphersApi, type CipherFilters } from '../api/ciphers';
import { errorMessage, isAbortError } from '../api/http';

interface CiphersState {
  ciphers: CipherDTO[];
  status: 'loading' | 'ready' | 'error';
  error: string | null;
}

/** Загружает шифры по фильтрам. Во время повторной загрузки показываются предыдущие результаты. */
export function useCiphers({ query, tagIds }: CipherFilters) {
  const [state, setState] = useState<CiphersState>({ ciphers: [], status: 'loading', error: null });
  const [version, setVersion] = useState(0);
  const tagKey = tagIds.join(',');

  useEffect(() => {
    const controller = new AbortController();
    const ids = tagKey ? tagKey.split(',').map(Number) : [];
    ciphersApi
      .list({ query, tagIds: ids }, controller.signal)
      .then((ciphers) => setState({ ciphers, status: 'ready', error: null }))
      .catch((error: unknown) => {
        if (!isAbortError(error)) setState((prev) => ({ ...prev, status: 'error', error: errorMessage(error) }));
      });
    return () => controller.abort();
  }, [query, tagKey, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { ...state, reload };
}
