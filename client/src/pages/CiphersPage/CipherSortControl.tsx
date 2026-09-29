import { useId } from 'react';
import { DEFAULT_DIRECTION, type CipherSort, type CipherSortField } from '../../../../shared/cipherSort';

const FIELD_LABELS: Record<CipherSortField, string> = {
  date: 'Дата',
  name: 'Алфавит',
  tags: 'Количество тегов',
};

const DIRECTION_LABELS: Record<CipherSortField, Record<CipherSort['direction'], string>> = {
  date: { desc: 'Новые → старые', asc: 'Старые → новые' },
  name: { asc: 'А → Я', desc: 'Я → А' },
  tags: { desc: 'Больше → меньше', asc: 'Меньше → больше' },
};

interface CipherSortControlProps {
  value: CipherSort;
  onChange: (sort: CipherSort) => void;
}

/** Вид сортировки и направление; кнопка направления переключает его на противоположное. */
export function CipherSortControl({ value, onChange }: CipherSortControlProps) {
  const selectId = useId();
  const { field, direction } = value;

  return (
    <div className="cipher-sort">
      <label className="visually-hidden" htmlFor={selectId}>
        Сортировка
      </label>
      <select
        id={selectId}
        className="select select--sm"
        value={field}
        onChange={(event) => {
          const next = event.target.value as CipherSortField;
          onChange({ field: next, direction: DEFAULT_DIRECTION[next] });
        }}
      >
        {(Object.keys(FIELD_LABELS) as CipherSortField[]).map((option) => (
          <option key={option} value={option}>
            {FIELD_LABELS[option]}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        title="Сменить направление"
        onClick={() => onChange({ field, direction: direction === 'asc' ? 'desc' : 'asc' })}
      >
        {DIRECTION_LABELS[field][direction]}
      </button>
    </div>
  );
}
