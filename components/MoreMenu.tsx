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
        className="p-2 rounded-full transition-colors text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 cursor-pointer"
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
                  zIndex: 50,
                  visibility: pos ? 'visible' : 'hidden',
                }}
                className="min-w-40 bg-white border border-neutral-200 shadow-2xl rounded-sm py-2"
              >
                {items.map((item) => (
                  <button
                    key={item.key}
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      item.onClick();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-[10px] tracking-widest uppercase font-medium text-left transition-colors cursor-pointer ${
                      item.danger
                        ? 'text-red-500 hover:bg-red-50'
                        : 'text-neutral-700 hover:bg-neutral-100'
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
