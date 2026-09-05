'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

function subscribe() {
  return () => {};
}

// Renders overlays as direct children of <body> so page-level stacking
// contexts (transforms, filters, sticky sections, oversized typography)
// can never trap them or paint above them.
export function OverlayPortal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
