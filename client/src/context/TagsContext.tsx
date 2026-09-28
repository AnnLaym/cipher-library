import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { TagDTO } from '../../../shared/types';
import { errorMessage } from '../api/http';
import { tagsApi } from '../api/tags';
import { createTagIndex, type TagIndex } from '../lib/tagIndex';

interface TagsContextValue {
  index: TagIndex;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  reload: () => Promise<void>;
}

const TagsContext = createContext<TagsContextValue | null>(null);

/** Единый список тегов для всего приложения: фильтры, формы шифров и страница тегов. */
export function TagsProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useState<TagDTO[]>([]);
  const [status, setStatus] = useState<TagsContextValue['status']>('loading');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setTags(await tagsApi.list());
      setStatus('ready');
      setError(null);
    } catch (err) {
      setStatus((current) => (current === 'ready' ? current : 'error'));
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const index = useMemo(() => createTagIndex(tags), [tags]);
  const value = useMemo(() => ({ index, status, error, reload }), [index, status, error, reload]);

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>;
}

export function useTags(): TagsContextValue {
  const value = useContext(TagsContext);
  if (!value) throw new Error('useTags должен использоваться внутри TagsProvider');
  return value;
}
