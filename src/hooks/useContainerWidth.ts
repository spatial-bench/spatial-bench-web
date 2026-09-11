import { useEffect, useRef, useState } from "react";

/**
 * The rendered width of a container element, tracked with a ResizeObserver —
 * charts resize with the viewport (portrait, landscape, desktop) instead of
 * being baked at a fixed pixel width.
 */
export function useContainerWidth(maxWidth: number): {
  ref: React.RefObject<HTMLDivElement | null>;
  width: number;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(maxWidth);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    const observer = new ResizeObserver((entries) => {
      const observed = entries[0]?.contentRect.width;
      if (observed !== undefined) {
        setWidth(Math.max(280, Math.min(maxWidth, Math.floor(observed))));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [maxWidth]);

  return { ref, width: width };
}
