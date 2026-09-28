import type { CipherDTO } from '../../../../shared/types';
import { Icon } from '../../components/Icon';
import { TagChip } from '../../components/TagChip';
import './CipherCard.css';

interface CipherCardProps {
  cipher: CipherDTO;
  onEdit: () => void;
  onDelete: () => void;
}

export function CipherCard({ cipher, onEdit, onDelete }: CipherCardProps) {
  return (
    <article className="cipher-card hover-host">
      <header className="cipher-card__head">
        <h3 className="cipher-card__word">{cipher.word}</h3>
        <div className="hover-actions">
          <button type="button" className="icon-btn" onClick={onEdit} aria-label={`Редактировать «${cipher.word}»`}>
            <Icon name="pencil" size={15} />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            onClick={onDelete}
            aria-label={`Удалить «${cipher.word}»`}
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      </header>
      {cipher.description && <p className="cipher-card__description">{cipher.description}</p>}
      {cipher.tags.length > 0 && (
        <div className="cipher-card__tags">
          {cipher.tags.map((tag) => (
            <TagChip key={tag.id} name={tag.name} color={tag.color} />
          ))}
        </div>
      )}
    </article>
  );
}
