import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { CipherDTO, CipherInput } from '../../../../shared/types';
import { errorMessage } from '../../api/http';
import { TagInput } from '../../components/TagInput/TagInput';
import { draftsFromCipher, draftsToInput, type TagDraft } from '../../components/TagInput/tagDraft';
import { useTags } from '../../context/TagsContext';
import './CipherForm.css';

interface CipherFormProps {
  /** Шифр для редактирования; без него форма создаёт новый. */
  cipher?: CipherDTO;
  onSubmit: (input: CipherInput) => Promise<void>;
  onCancel: () => void;
}

/** Одна и та же форма для добавления и редактирования шифра. */
export function CipherForm({ cipher, onSubmit, onCancel }: CipherFormProps) {
  const { index } = useTags();
  const fieldId = useId();
  const wordRef = useRef<HTMLInputElement>(null);
  const [word, setWord] = useState(cipher?.word ?? '');
  const [description, setDescription] = useState(cipher?.description ?? '');
  const [tags, setTags] = useState<TagDraft[]>(() => draftsFromCipher(cipher?.tags ?? []));
  const [wordError, setWordError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (saving) return;
    if (!word.trim()) {
      setWordError(true);
      wordRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ word: word.trim(), description: description.trim(), tags: draftsToInput(tags, index) });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form className="cipher-form" onSubmit={submit} onKeyDown={handleKeyDown} noValidate>
      <div className="field">
        <label className="field-label" htmlFor={`${fieldId}-word`}>
          Слово-шифр
        </label>
        <input
          ref={wordRef}
          id={`${fieldId}-word`}
          className="input cipher-form__word"
          value={word}
          autoFocus
          autoComplete="off"
          aria-invalid={wordError}
          onChange={(event) => {
            setWord(event.target.value);
            setWordError(false);
          }}
        />
        {wordError && <p className="form-error">Введите слово-шифр</p>}
      </div>

      <div className="field">
        <label className="field-label" htmlFor={`${fieldId}-description`}>
          Описание
        </label>
        <textarea
          id={`${fieldId}-description`}
          className="textarea"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor={`${fieldId}-tags`}>
          Теги
        </label>
        <TagInput id={`${fieldId}-tags`} value={tags} onChange={setTags} />
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="cipher-form__actions">
        <span className="cipher-form__hint">Ctrl + Enter — сохранить</span>
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={saving}>
          Отмена
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {cipher ? 'Сохранить' : 'Добавить'}
        </button>
      </div>
    </form>
  );
}
