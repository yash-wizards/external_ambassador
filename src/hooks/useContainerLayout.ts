import { useEffect, useState } from 'react';

export type LayoutSize = 'compact' | 'tablet' | 'desktop';

export function layoutFromWidth(width: number): LayoutSize {
  if (width > 0 && width < 720) return 'compact';
  if (width > 0 && width < 1100) return 'tablet';
  return 'desktop';
}

/** Size the shell from the iframe viewport, not the parent browser window. */
export function useContainerLayout(target: HTMLElement | null): LayoutSize {
  const [layout, setLayout] = useState<LayoutSize>('desktop');

  useEffect(() => {
    if (!target) return undefined;
    const update = (width: number) => setLayout(layoutFromWidth(width));
    update(target.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      update(width);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [target]);

  return layout;
}
