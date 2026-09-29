import { useId, useMemo, useState, type FormEvent } from 'react';
import { DEFAULT_TAG_COLOR } from '../../../../shared/colors';
import { formatTagName, normalizeTagName } from '../../../../shared/tagName';
import type { TagDTO, TagInput } from '../../../../shared/types';
import { errorMessage } from '../../api/http';
import { ColorPicker } from '../../components/ColorPicker';
import { TagChip } from '../../components/TagChip';
import { useTags } from '../../context/TagsContext';
import { flattenTree } from '../../lib/tagIndex';

interface TagFormProps {
  /** Редактируемый тег; без него форма создаёт новый. */
  tag?: TagDTO;
  defaultParentId?: number | null;
  onSubmit: (input: TagInput) => Promise<void>;
  onCancel: () => void;
}

export function TagForm({ tag, defaultParentId = null, onSubmit, onCancel }: TagFormProps) {
  const { index } = useTags();
  const fieldId = useId();
  const [name, setName] = useState(tag?.name ?? '');
  const [parentIds, setParentIds] = useState<(number | null)[]>(() => {
    const initial = tag ? index.parentsOf(tag.id).map((parent) => parent.id) : [defaultParentId];
    return [initial[0] ?? null, initial[1] ?? null];
  });
  const [color, setColor] = useState(tag?.color ?? DEFAULT_TAG_COLOR);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const options = useMemo(() => flattenTree(index), [index]);
  // Нельзя выбрать родителем сам тег или его потомка — получится цикл (сервер проверяет то же самое).
  const blockedParents = useMemo(() => (tag ? index.descendantsOf(tag.id) : new Set<number>()), [index, tag]);

  const setParent = (slot: number, value: number | null) => {
    const next = [...parentIds];
    next[slot] = value;
    // Второй родитель без первого становится первым.
    setParentIds(next[0] === null ? [next[1], null] : next);
  };

  const clash = index.byNormalizedName.get(normalizeTagName(name));
  const duplicate = clash && clash.id !== tag?.id ? clash : undefined;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Введите название тега');
      return;
    }
    if (duplicate) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ name, color, parentIds: parentIds.filter((id) => id !== null) });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form className="tag-form" onSubmit={submit} noValidate>
      <div className="tag-form__fields">
        <div className="field">
          <label className="field-label" htmlFor={`${fieldId}-name`}>
            Название
          </label>
          <input
            id={`${fieldId}-name`}
            className="input"
            value={name}
            autoFocus
            autoComplete="off"
            aria-invalid={Boolean(duplicate)}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
        </div>

        {parentIds.map((parentId, slot) => {
          const otherId = parentIds[1 - slot];
          return (
            <div key={slot} className="field">
              <label className="field-label" htmlFor={`${fieldId}-parent-${slot}`}>
                {slot === 0 ? 'Родитель' : 'Второй родитель'}
              </label>
              <select
                id={`${fieldId}-parent-${slot}`}
                className="select"
                value={parentId ?? ''}
                disabled={slot === 1 && parentIds[0] === null}
                onChange={(event) => setParent(slot, event.target.value ? Number(event.target.value) : null)}
              >
                <option value="">{slot === 0 ? 'Без родителя' : 'Нет'}</option>
                {options.map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                    disabled={blockedParents.has(option.id) || option.id === otherId}
                  >
                    {index.pathLabel(option.id)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className="field">
        <span className="field-label">Цвет</span>
        <div className="tag-form__color">
          <ColorPicker value={color} onChange={setColor} />
          <TagChip name={formatTagName(name) || 'Тег'} color={color} />
        </div>
      </div>

      {duplicate && <p className="form-error">Тег «{duplicate.name}» уже существует.</p>}
      {error && <p className="form-error">{error}</p>}

      <div className="tag-form__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel} disabled={saving}>
          Отмена
        </button>
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving || Boolean(duplicate)}>
          {tag ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </form>
  );
}
