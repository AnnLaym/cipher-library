import { useState } from 'react';
import type { CipherDTO, CipherInput } from '../../../../shared/types';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CipherCard } from './CipherCard';
import { CipherForm } from './CipherForm';

interface CipherListProps {
  ciphers: CipherDTO[];
  onUpdate: (id: number, input: CipherInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

/** Список карточек; одна карточка за раз может быть в режиме редактирования. */
export function CipherList({ ciphers, onUpdate, onDelete }: CipherListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<CipherDTO | null>(null);

  return (
    <>
      <div className="cipher-list">
        {ciphers.map((cipher) =>
          cipher.id === editingId ? (
            <CipherForm
              key={cipher.id}
              cipher={cipher}
              onCancel={() => setEditingId(null)}
              onSubmit={async (input) => {
                await onUpdate(cipher.id, input);
                setEditingId(null);
              }}
            />
          ) : (
            <CipherCard
              key={cipher.id}
              cipher={cipher}
              onEdit={() => setEditingId(cipher.id)}
              onDelete={() => setDeleting(cipher)}
            />
          ),
        )}
      </div>

      {deleting && (
        <ConfirmDialog
          title={`Удалить шифр «${deleting.word}»?`}
          confirmLabel="Удалить"
          onConfirm={() => onDelete(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
