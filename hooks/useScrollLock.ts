'use client';

import { useEffect } from 'react';

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const scrollRoot = document.getElementById('scroll-root');
    const targets = scrollRoot ? [scrollRoot, document.body] : [document.body];
    const originals = targets.map((el) => el.style.overflow);
    targets.forEach((el) => {
      el.style.overflow = 'hidden';
    });
    return () => {
      targets.forEach((el, i) => {
        el.style.overflow = originals[i];
      });
    };
  }, [active]);
}
