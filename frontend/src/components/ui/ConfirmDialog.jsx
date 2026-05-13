import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Are you sure?',
    message = 'This action cannot be undone.',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    loading = false,
}) {
    const confirmStyles = variant === 'danger'
        ? 'bg-error hover:bg-error/90 text-white'
        : 'bg-buy-primary hover:bg-buy-primary-hover text-text-primary font-bold';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm" showCloseButton={false}>
            <div className="flex flex-col items-center text-center py-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                    variant === 'danger' ? 'bg-error/10 text-error' : 'bg-trust/10 text-trust'
                }`}>
                    <AlertTriangle size={24} />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
                <p className="text-sm text-text-muted mb-6">{message}</p>
                <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="w-full sm:flex-1 min-h-11 px-4 py-3 rounded-lg border border-border-default bg-surface hover:bg-surface-hover text-text-primary text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`w-full sm:flex-1 min-h-11 px-4 py-3 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${confirmStyles}`}
                    >
                        {loading ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
