'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export type MoreMenuItem = {
  key: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
}

const GAP = 6;
const VIEWPORT_MARGIN = 8;

export function MoreMenu({
  items,
  align = 'right',
  label = 'More actions',
}: {
  items: MoreMenuItem[]
  align?: 'left' | 'right'
  label?: string
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = menu.offsetHeight;
    const menuWidth = menu.offsetWidth;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const placeBelow = rect.bottom + GAP + menuHeight <= viewportHeight - VIEWPORT_MARGIN;

    const left = Math.min(
      Math.max(
        align === 'right' ? rect.right - menuWidth : rect.left,
        VIEWPORT_MARGIN,
      ),
      viewportWidth - menuWidth - VIEWPORT_MARGIN,
    );

    const top = placeBelow
      ? rect.bottom + GAP
      : Math.max(VIEWPORT_MARGIN, rect.top - GAP - menuHeight);

    setPos({ top, left });
  }, [align]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, items, place]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-sheet hover:text-ink"
      >
        <MoreHorizontal size={18} strokeWidth={1.5} />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={menuRef}
                role="menu"
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: 'fixed',
                  top: pos?.top ?? 0,
                  left: pos?.left ?? 0,
                  zIndex: 70,
                  visibility: pos ? 'visible' : 'hidden',
                }}
                className="max-h-[min(24rem,calc(100dvh-1rem))] min-w-44 overflow-y-auto rounded-2xl border border-line bg-white py-2 shadow-[0_18px_60px_rgba(23,20,17,0.14)]"
              >
                {items.map((item) => (
                  <button
                    key={item.key}
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      item.onClick();
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                      item.danger
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-ink hover:bg-soft'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
