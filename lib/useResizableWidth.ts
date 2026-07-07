"use client";

import { useEffect, useRef, useState } from "react";

interface UseResizableWidthOptions {
  min: number;
  max: number;
  default: number;
  storageKey: string;
  /**
   * Which side of the resized element the drag handle sits on.
   * "right" (default): handle is on the element's right edge, dragging
   * right grows it (e.g. the sidebar, a left-hand file tree).
   * "left": handle is on the element's left edge, dragging left grows it
   * (e.g. a right-hand panel whose left edge is the divider).
   */
  edge?: "left" | "right";
}

/**
 * Drag-to-resize width, persisted to localStorage. Generalizes the resize
 * behavior originally built for the sidebar (see git history of
 * components/Sidebar.tsx) so it can be reused for any horizontally
 * resizable pane.
 */
export function useResizableWidth({
  min,
  max,
  default: defaultWidth,
  storageKey,
  edge = "right",
}: UseResizableWidthOptions) {
  const [width, setWidth] = useState(defaultWidth);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(defaultWidth);

  // Restore a remembered width on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? parseInt(stored, 10) : NaN;
      if (!Number.isNaN(parsed)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a value persisted outside React (localStorage)
        setWidth(Math.min(max, Math.max(min, parsed)));
      }
    } catch {
      // Storage may be unavailable (private mode); fall back to the default width.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read localStorage once per mount for this storageKey
  }, [storageKey]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isResizing.current) return;
      const dx = e.clientX - startX.current;
      const signedDx = edge === "left" ? -dx : dx;
      setWidth(Math.min(max, Math.max(min, startWidth.current + signedDx)));
    };
    const handlePointerUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setWidth((w) => {
        try {
          localStorage.setItem(storageKey, String(w));
        } catch {
          // Storage may be unavailable (private mode); resizing still works for this tab.
        }
        return w;
      });
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [min, max, storageKey, edge]);

  const handleResizeStart = (e: React.PointerEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return { width, handleResizeStart };
}
