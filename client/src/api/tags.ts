import type { TagDTO, TagInput } from '../../../shared/types';
import { request } from './http';

export const tagsApi = {
  list(): Promise<TagDTO[]> {
    return request<TagDTO[]>('/tags');
  },

  create(input: TagInput): Promise<TagDTO> {
    return request<TagDTO>('/tags', { method: 'POST', body: input });
  },

  update(id: number, input: TagInput): Promise<TagDTO> {
    return request<TagDTO>(`/tags/${id}`, { method: 'PUT', body: input });
  },

  remove(id: number): Promise<void> {
    return request<void>(`/tags/${id}`, { method: 'DELETE' });
  },
};
