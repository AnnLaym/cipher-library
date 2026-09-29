import type { CipherSort } from '../../../../shared/cipherSort';
import { TagChip } from '../../components/TagChip';
import { useTags } from '../../context/TagsContext';
import { CipherSortControl } from './CipherSortControl';

interface ResultsBarProps {
  count: number;
  hasFilters: boolean;
  selectedTagIds: readonly number[];
  sort: CipherSort;
  onRemoveTag: (id: number) => void;
  onReset: () => void;
  onSortChange: (sort: CipherSort) => void;
}

export function ResultsBar(props: ResultsBarProps) {
  const { count, hasFilters, selectedTagIds, onRemoveTag, onReset } = props;
  const { index } = useTags();
  const selectedTags = selectedTagIds.flatMap((id) => index.byId.get(id) ?? []);

  return (
    <div className="results-bar">
      <span className="results-bar__count">
        {hasFilters ? 'Найдено' : 'Всего'}: <strong>{count}</strong>
      </span>
      {selectedTags.map((tag) => (
        <TagChip key={tag.id} name={tag.name} color={tag.color} selected onRemove={() => onRemoveTag(tag.id)} />
      ))}
      {hasFilters && (
        <button type="button" className="btn btn--link results-bar__reset" onClick={onReset}>
          Сбросить фильтры
        </button>
      )}
      <CipherSortControl value={props.sort} onChange={props.onSortChange} />
    </div>
  );
}
