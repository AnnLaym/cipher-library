import { useEffect, useRef, useState, type ReactNode } from 'react';
import { errorMessage } from '../api/http';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  title: string;
  confirmLabel: string;
  children?: ReactNode;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/** Подтверждение разрушительного действия. Показывается, пока компонент смонтирован. */
export function ConfirmDialog({ title, confirmLabel, children, onConfirm, onClose }: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        // Клик по затемнённому фону закрывает окно.
        if (event.target === dialogRef.current && !busy) onClose();
      }}
    >
      <div className="confirm-dialog__body">
        <h2 className="confirm-dialog__title">{title}</h2>
        {children && <div className="confirm-dialog__text">{children}</div>}
        {error && <p className="form-error">{error}</p>}
        <div className="confirm-dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy} autoFocus>
            Отмена
          </button>
          <button type="button" className="btn btn--danger" onClick={confirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
