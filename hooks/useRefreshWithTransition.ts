'use client';

import { useCallback, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function useRefreshWithTransition(throttleMs = 0) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const lastRefreshRef = useRef(0);

  const refresh = useCallback(() => {
    const now = Date.now();
    if (throttleMs > 0 && now - lastRefreshRef.current < throttleMs) return;
    lastRefreshRef.current = now;
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition, throttleMs]);

  return { refresh, isPending };
}