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
    variant = 'center',
}) {
    const isSheet = variant === 'sheet';
    const dialogRef = useRef(null);
    const previousFocus = useRef(null);
    // Avoid re-running open effects when parents pass an inline onClose (new ref each render).
    // Otherwise requestAnimationFrame re-focuses the first focusable (often the X button) on every keystroke.
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

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
            if (e.key === 'Escape') onCloseRef.current();
            trapFocus(e);
        };
        document.addEventListener('keydown', handleKeyDown);

        requestAnimationFrame(() => {
            const root = dialogRef.current;
            if (!root) return;
            const preferred = root.querySelector(
                'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
            );
            if (preferred) {
                preferred.focus();
                return;
            }
            const focusable = root.querySelectorAll(FOCUSABLE);
            if (focusable?.length) focusable[0].focus();
        });

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            previousFocus.current?.focus();
        };
    }, [isOpen, trapFocus]);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex ${isSheet ? 'items-end sm:items-center' : 'items-center'} justify-center ${isSheet ? 'p-0 sm:p-4' : 'p-4'}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                onClick={closeOnBackdrop ? () => onCloseRef.current() : undefined}
                aria-hidden="true"
            />
            <div
                ref={dialogRef}
                className={`relative bg-surface border border-border-default shadow-2xl w-full ${maxWidth} overflow-y-auto animate-in duration-200
                    ${isSheet
                        ? 'rounded-t-2xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[90dvh] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] slide-in-from-bottom sm:zoom-in'
                        : 'rounded-2xl max-h-[90dvh] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] zoom-in'
                    }`}
            >
                {isSheet && (
                    <div className="sm:hidden sticky -top-6 -mx-6 -mt-6 mb-3 pt-2 pb-1 bg-surface flex justify-center" aria-hidden="true">
                        <span className="h-1 w-10 rounded-full bg-border-default" />
                    </div>
                )}
                {showCloseButton && (
                    <button
                        onClick={() => onCloseRef.current()}
                        className="absolute top-2 right-2 z-10 min-touch rounded-full text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors touch-manipulation"
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
