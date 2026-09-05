'use client';

import { useEffect, useRef } from 'react';
import { useRefreshWithTransition } from './useRefreshWithTransition';

const CHANNEL_NAME = 'notakpmb-live';
const INTERVAL_MS = 30_000;

let channel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  channel = new BroadcastChannel(CHANNEL_NAME);
}

export function notifyLiveSync(tag: string) {
  channel?.postMessage({ type: 'live-sync', tag, at: Date.now() });
}

export function useLiveSync(options?: { intervalMs?: number; enabled?: boolean }) {
  const { refresh, isPending } = useRefreshWithTransition();
  const intervalMs = options?.intervalMs ?? INTERVAL_MS;
  const enabled = options?.enabled ?? true;
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    function handleSync() {
      const now = Date.now();
      if (now - lastRefreshRef.current < 2000) return;
      lastRefreshRef.current = now;
      refresh();
    }

    const unsubscribe: (() => void)[] = [];

    if (channel) {
      const onMessage = (event: MessageEvent) => {
        if (event.data?.type === 'live-sync') {
          handleSync();
        }
      };
      channel.addEventListener('message', onMessage);
      unsubscribe.push(() => channel.removeEventListener('message', onMessage));
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleSync();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    unsubscribe.push(() => document.removeEventListener('visibilitychange', onVisibility));

    const onFocus = () => handleSync();
    window.addEventListener('focus', onFocus);
    unsubscribe.push(() => window.removeEventListener('focus', onFocus));

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleSync();
      }
    }, intervalMs);
    unsubscribe.push(() => clearInterval(intervalId));

    return () => {
      for (const fn of unsubscribe) fn();
    };
  }, [refresh, intervalMs, enabled]);

  return { isPending };
}