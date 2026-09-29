import { formatCipherSort, type CipherSort } from '../../../shared/cipherSort';
import type { CipherDTO, CipherInput } from '../../../shared/types';
import { request } from './http';

export interface CipherFilters {
  query: string;
  tagIds: readonly number[];
  sort: CipherSort;
}

export const ciphersApi = {
  list({ query, tagIds, sort }: CipherFilters, signal?: AbortSignal): Promise<CipherDTO[]> {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (tagIds.length > 0) params.set('tags', tagIds.join(','));
    params.set('sort', formatCipherSort(sort));
    const search = params.toString();
    return request<CipherDTO[]>(`/ciphers${search ? `?${search}` : ''}`, { signal });
  },

  create(input: CipherInput): Promise<CipherDTO> {
    return request<CipherDTO>('/ciphers', { method: 'POST', body: input });
  },

  update(id: number, input: CipherInput): Promise<CipherDTO> {
    return request<CipherDTO>(`/ciphers/${id}`, { method: 'PUT', body: input });
  },

  remove(id: number): Promise<void> {
    return request<void>(`/ciphers/${id}`, { method: 'DELETE' });
  },
};
