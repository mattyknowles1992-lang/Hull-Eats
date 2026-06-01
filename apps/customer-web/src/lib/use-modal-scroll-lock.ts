import { useEffect, useRef } from "react";

/**
 * Locks document scroll while a modal is open. Capture scroll position once per open —
 * do not re-run when modal inner state (e.g. selected options) changes.
 */
export function useModalScrollLock(open: boolean): void {
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    scrollYRef.current = window.scrollY;

    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousLeft = document.body.style.left;
    const previousRight = document.body.style.right;
    const previousWidth = document.body.style.width;
    const previousHtmlTouchAction = document.documentElement.style.touchAction;

    document.documentElement.style.touchAction = "none";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      const restoreY = scrollYRef.current;
      document.documentElement.style.touchAction = previousHtmlTouchAction;
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.left = previousLeft;
      document.body.style.right = previousRight;
      document.body.style.width = previousWidth;
      requestAnimationFrame(() => {
        window.scrollTo(0, restoreY);
      });
    };
  }, [open]);
}
