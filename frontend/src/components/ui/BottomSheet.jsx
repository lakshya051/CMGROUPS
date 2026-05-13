import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * BottomSheet — mobile-first modal that slides from the bottom.
 * - Rounded top, drag-handle affordance, scroll-lock, backdrop
 * - Respects safe-area-inset-bottom
 * - Focus trap + restore focus on close + Escape to close
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - title?: string                  (rendered as sheet header if provided)
 *  - children: ReactNode
 *  - maxHeight?: string              (CSS height, default '85dvh')
 *  - closeOnBackdrop?: boolean       (default true)
 *  - showHandle?: boolean            (default true)
 *  - footer?: ReactNode              (sticky footer inside the sheet, e.g. action buttons)
 *  - ariaLabel?: string
 */
export default function BottomSheet({
    isOpen,
    onClose,
    title,
    children,
    maxHeight = '85dvh',
    closeOnBackdrop = true,
    showHandle = true,
    footer,
    ariaLabel,
}) {
    const sheetRef = useRef(null);
    const previousFocus = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    const trapFocus = useCallback((e) => {
        if (e.key !== 'Tab' || !sheetRef.current) return;
        const focusable = sheetRef.current.querySelectorAll(FOCUSABLE);
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
            const root = sheetRef.current;
            if (!root) return;
            const focusable = root.querySelectorAll(FOCUSABLE);
            if (focusable?.length) focusable[0].focus();
        });

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            previousFocus.current?.focus?.();
        };
    }, [isOpen, trapFocus]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[70]"
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel || title || 'Dialog'}
        >
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={closeOnBackdrop ? () => onCloseRef.current() : undefined}
                aria-hidden="true"
            />
            <div
                ref={sheetRef}
                className="fixed inset-x-0 bottom-0 bg-surface rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.18)] flex flex-col animate-in slide-in-from-bottom duration-300"
                style={{ maxHeight }}
            >
                {showHandle && (
                    <div className="pt-2 pb-1 flex justify-center shrink-0">
                        <span className="h-1 w-10 rounded-full bg-border-default" aria-hidden="true" />
                    </div>
                )}
                {title && (
                    <div className="flex items-center justify-between px-4 pb-3 border-b border-border-default shrink-0">
                        <h2 className="text-base font-heading font-bold text-text-primary">{title}</h2>
                        <button
                            onClick={() => onCloseRef.current()}
                            className="min-touch rounded-full text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                            aria-label="Close"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto overscroll-contain scrollable p-4">
                    {children}
                </div>
                {footer && (
                    <div
                        className="border-t border-border-default bg-surface px-4 py-3 shrink-0"
                        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                    >
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
