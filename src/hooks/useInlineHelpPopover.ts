import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';

export interface InlineHelpPopoverPosition {
  top: number;
  left: number;
  width: number;
}

export interface InlineHelpPopoverOptions {
  suppressed?: boolean;
  estimatedHeight: number;
  maxWidth: number;
  offset?: number;
  viewportMargin?: number;
}

const DEFAULT_OFFSET = 12;
const DEFAULT_VIEWPORT_MARGIN = 16;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function getInlineHelpPopoverPosition(
  triggerRect: DOMRect,
  panelHeight: number,
  {
    maxWidth,
    offset = DEFAULT_OFFSET,
    viewportMargin = DEFAULT_VIEWPORT_MARGIN,
  }: Pick<InlineHelpPopoverOptions, 'maxWidth' | 'offset' | 'viewportMargin'>,
): InlineHelpPopoverPosition {
  const availableWidth = Math.max(0, window.innerWidth - (viewportMargin * 2));
  const panelWidth = Math.min(maxWidth, availableWidth);
  const halfPanelWidth = panelWidth / 2;
  const minLeft = viewportMargin + halfPanelWidth;
  const maxLeft = window.innerWidth - viewportMargin - halfPanelWidth;
  const left = clamp(triggerRect.left + (triggerRect.width / 2), minLeft, Math.max(minLeft, maxLeft));

  const spaceBelow = window.innerHeight - triggerRect.bottom - viewportMargin;
  const spaceAbove = triggerRect.top - viewportMargin;
  const placeAbove = spaceBelow < panelHeight && spaceAbove > spaceBelow;
  const preferredTop = placeAbove
    ? triggerRect.top - panelHeight - offset
    : triggerRect.bottom + offset;
  const maxTop = Math.max(viewportMargin, window.innerHeight - panelHeight - viewportMargin);

  return {
    left,
    top: clamp(preferredTop, viewportMargin, maxTop),
    width: panelWidth,
  };
}

export function useInlineHelpPopover({
  suppressed = false,
  estimatedHeight,
  maxWidth,
  offset = DEFAULT_OFFSET,
  viewportMargin = DEFAULT_VIEWPORT_MARGIN,
}: InlineHelpPopoverOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<InlineHelpPopoverPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  const close = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    setPanelPosition(null);

    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  const updatePanelPosition = useCallback((panelHeight = estimatedHeight) => {
    if (typeof window === 'undefined') {
      return;
    }

    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (!triggerRect) {
      return;
    }

    setPanelPosition(getInlineHelpPopoverPosition(triggerRect, panelHeight, {
      maxWidth,
      offset,
      viewportMargin,
    }));
  }, [estimatedHeight, maxWidth, offset, viewportMargin]);

  const toggle = useCallback(() => {
    if (suppressed) {
      close(false);
      return;
    }

    setIsOpen((previous) => {
      const nextOpen = !previous;

      if (nextOpen) {
        updatePanelPosition();
      } else {
        setPanelPosition(null);
      }

      return nextOpen;
    });
  }, [close, suppressed, updatePanelPosition]);

  useEffect(() => {
    if (!suppressed) {
      return;
    }

    close(false);
  }, [close, suppressed]);

  useEffect(() => {
    if (suppressed || !isOpen) {
      setPanelPosition(null);
      return undefined;
    }

    const syncPanelPosition = () => {
      updatePanelPosition(panelRef.current?.offsetHeight ?? estimatedHeight);
    };

    syncPanelPosition();
    const frameId = window.requestAnimationFrame(syncPanelPosition);
    document.addEventListener('scroll', syncPanelPosition, true);
    window.addEventListener('resize', syncPanelPosition);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.removeEventListener('scroll', syncPanelPosition, true);
      window.removeEventListener('resize', syncPanelPosition);
    };
  }, [estimatedHeight, isOpen, suppressed, updatePanelPosition]);

  useEffect(() => {
    if (suppressed || !isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (
        !target ||
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }

      close(false);
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (
        !target ||
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }

      close(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      close(true);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('focusin', handleFocusIn);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [close, isOpen, suppressed]);

  const panelStyle = useMemo<CSSProperties | undefined>(() => {
    if (!panelPosition) {
      return undefined;
    }

    return {
      top: panelPosition.top,
      left: panelPosition.left,
      width: panelPosition.width,
      maxWidth: `calc(100vw - ${viewportMargin * 2}px)`,
      transform: 'translateX(-50%)',
    };
  }, [panelPosition, viewportMargin]);

  return {
    close,
    isOpen,
    panelId,
    panelRef,
    panelStyle,
    toggle,
    triggerRef,
  };
}
