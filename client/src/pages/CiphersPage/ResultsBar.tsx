import { TagChip } from '../../components/TagChip';
import { useTags } from '../../context/TagsContext';

interface ResultsBarProps {
  count: number;
  hasFilters: boolean;
  selectedTagIds: readonly number[];
  onRemoveTag: (id: number) => void;
  onReset: () => void;
}

export function ResultsBar({ count, hasFilters, selectedTagIds, onRemoveTag, onReset }: ResultsBarProps) {
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
    </div>
  );
}
