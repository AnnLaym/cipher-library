import { Icon } from './Icon';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <div className="search-input">
      <Icon name="search" size={15} />
      <input
        type="search"
        name="search"
        className="search-input__field"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault();
            onChange('');
          }
        }}
      />
      {value && (
        <button type="button" className="search-input__clear" onClick={() => onChange('')} aria-label="Очистить поиск">
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
}
