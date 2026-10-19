import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'warning';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'تأكيد العملية',
  message,
  confirmLabel = 'تأكيد',
  loading = false,
  variant = 'danger',
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" persistent={loading}>
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className={`p-3 rounded-full ${variant === 'danger' ? 'bg-brand-red/10 text-brand-red' : 'bg-warning/10 text-warning'}`}>
          <AlertTriangle className="w-7 h-7" />
        </div>
        <p className="text-text-secondary text-sm leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-3 mt-6">
        <Button variant="secondary" fullWidth onClick={onClose} disabled={loading}>
          إلغاء
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          fullWidth
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
