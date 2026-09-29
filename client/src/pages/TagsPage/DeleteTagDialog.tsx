import type { TagDTO } from '../../../../shared/types';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { plural } from '../../lib/plural';

interface DeleteTagDialogProps {
  tag: TagDTO;
  childCount: number;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function DeleteTagDialog({ tag, childCount, onConfirm, onClose }: DeleteTagDialogProps) {
  const used = tag.cipherCount;

  return (
    <ConfirmDialog title={`Удалить тег «${tag.name}»?`} confirmLabel="Удалить" onConfirm={onConfirm} onClose={onClose}>
      <p>
        {used > 0
          ? `Тег используется в ${used} ${plural(used, ['шифре', 'шифрах', 'шифрах'])}.`
          : 'Тег не используется в шифрах.'}
      </p>
      {(used > 0 || childCount > 0) && (
        <>
          <p>После удаления:</p>
          <ul>
            {used > 0 && <li>шифры сохранятся;</li>}
            <li>тег будет удалён;</li>
            {used > 0 && <li>связанные шифры останутся без этого тега;</li>}
            {childCount > 0 && (
              <li>
                дочерние теги потеряют этого родителя: останутся под вторым, если он есть, иначе станут корневыми.
              </li>
            )}
          </ul>
        </>
      )}
    </ConfirmDialog>
  );
}
