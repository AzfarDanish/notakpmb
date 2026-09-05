'use client';

import { useLiveSync } from '@/hooks/useLiveSync';

export function LiveSyncProvider() {
  useLiveSync();
  return null;
}