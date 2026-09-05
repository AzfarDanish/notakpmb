'use client';

import { useEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;
let savedHtmlOverflow = '';
let savedBodyOverflow = '';
let savedBodyPaddingRight = '';
let savedBodyOverscroll = '';
let savedScrollRootOverflow = '';
let scrollLockActive = false;

function onTouchMove(event: TouchEvent) {
  const target = event.target as Element | null;
  if (target && typeof target.closest === 'function' && target.closest('[data-overlay-panel]')) {
    return;
  }
  if (event.cancelable) event.preventDefault();
}

function onWheel(event: WheelEvent) {
  const target = event.target as Element | null;
  if (target && typeof target.closest === 'function' && target.closest('[data-overlay-panel]')) {
    return;
  }
  if (event.cancelable) event.preventDefault();
}

function onKeyDown(event: KeyboardEvent) {
  const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
  if (!keys.includes(event.key)) return;
  const target = event.target as Element | null;
  if (target && typeof target.closest === 'function' && target.closest('[data-overlay-panel]')) {
    return;
  }
  // If focus is inside overlay, allow
  if (target && target.closest('[data-overlay-panel]')) return;
  event.preventDefault();
}

function onScroll() {
  if (!scrollLockActive) return;
  if (window.scrollY !== savedScrollY) {
    window.scrollTo(0, savedScrollY);
  }
}

function lock() {
  if (lockCount === 0) {
    const doc = document.documentElement;
    const body = document.body;
    savedScrollY = window.scrollY;
    savedHtmlOverflow = doc.style.overflow;
    savedBodyOverflow = body.style.overflow;
    savedBodyPaddingRight = body.style.paddingRight;
    savedBodyOverscroll = body.style.overscrollBehavior;

    const scrollbarWidth = window.innerWidth - doc.clientWidth;

    doc.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const scrollRoot = document.getElementById('scroll-root');
    if (scrollRoot) {
      savedScrollRootOverflow = scrollRoot.style.overflow;
      scrollRoot.style.overflow = 'hidden';
    }

    scrollLockActive = true;
    // Use passive:false to be able to preventDefault
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, { passive: false });
  }
  lockCount += 1;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    scrollLockActive = false;
    const doc = document.documentElement;
    const body = document.body;
    doc.style.overflow = savedHtmlOverflow;
    body.style.overflow = savedBodyOverflow;
    body.style.paddingRight = savedBodyPaddingRight;
    body.style.overscrollBehavior = savedBodyOverscroll;

    const scrollRoot = document.getElementById('scroll-root');
    if (scrollRoot) scrollRoot.style.overflow = savedScrollRootOverflow;

    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('wheel', onWheel);
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('scroll', onScroll);
    // No scrollTo here — scroll position was never changed, so no jump
    // If some programmatic scroll slipped through, onScroll would have already
    // reset it to savedScrollY while locked.
  }
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return () => unlock();
  }, [active]);
}
