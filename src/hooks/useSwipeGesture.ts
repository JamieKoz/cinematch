import { useEffect, useRef, useState } from "react";
import type React from "react";

export function useSwipeGesture(params: {
  currentTitleId?: string;
  onSwipeKeep: () => void;
  onSwipePass: () => void;
  swipeTriggerPx?: number;
}) {
  const { currentTitleId, onSwipeKeep, onSwipePass, swipeTriggerPx = 110 } = params;
  const [swipeDeltaX, setSwipeDeltaX] = useState(0);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const swipeStartXRef = useRef<number | null>(null);

  useEffect(() => {
    setSwipeDeltaX(0);
    setIsDraggingCard(false);
    swipeStartXRef.current = null;
  }, [currentTitleId]);

  function onSwipePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    swipeStartXRef.current = event.clientX;
    setIsDraggingCard(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onSwipePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingCard || swipeStartXRef.current === null) return;
    setSwipeDeltaX(event.clientX - swipeStartXRef.current);
  }

  function onSwipePointerEnd() {
    if (!isDraggingCard) return;

    const delta = swipeDeltaX;
    setIsDraggingCard(false);
    swipeStartXRef.current = null;

    if (delta > swipeTriggerPx) {
      setSwipeDeltaX(0);
      onSwipeKeep();
      return;
    }

    if (delta < -swipeTriggerPx) {
      setSwipeDeltaX(0);
      onSwipePass();
      return;
    }

    setSwipeDeltaX(0);
  }

  function resetSwipeGesture() {
    setSwipeDeltaX(0);
    setIsDraggingCard(false);
    swipeStartXRef.current = null;
  }

  return {
    swipeDeltaX,
    isDraggingCard,
    passOverlayOpacity: Math.min(1, Math.max(0, -swipeDeltaX / swipeTriggerPx)),
    keepOverlayOpacity: Math.min(1, Math.max(0, swipeDeltaX / swipeTriggerPx)),
    onSwipePointerDown,
    onSwipePointerMove,
    onSwipePointerEnd,
    resetSwipeGesture
  };
}
