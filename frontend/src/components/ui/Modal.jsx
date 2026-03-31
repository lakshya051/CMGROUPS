import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'max-w-lg',
    showCloseButton = true,
    closeOnBackdrop = true,
}) {
    const dialogRef = useRef(null);
    const previousFocus = useRef(null);

    const trapFocus = useCallback((e) => {
        if (e.key !== 'Tab' || !dialogRef.current) return;
        const focusable = dialogRef.current.querySelectorAll(FOCUSABLE);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        previousFocus.current = document.activeElement;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
            trapFocus(e);
        };
        document.addEventListener('keydown', handleKeyDown);

        requestAnimationFrame(() => {
            const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE);
            if (focusable?.length) focusable[0].focus();
        });

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            previousFocus.current?.focus();
        };
    }, [isOpen, onClose, trapFocus]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                onClick={closeOnBackdrop ? onClose : undefined}
                aria-hidden="true"
            />
            <div
                ref={dialogRef}
                className={`relative bg-surface border border-border-default shadow-2xl rounded-2xl w-full ${maxWidth} max-h-[90dvh] overflow-y-auto p-6 animate-in zoom-in duration-200`}
            >
                {showCloseButton && (
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 z-10 p-2 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors touch-manipulation"
                        aria-label="Close dialog"
                    >
                        <X size={20} />
                    </button>
                )}
                {children}
            </div>
        </div>
    );
}
