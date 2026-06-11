import { useEffect, useRef, useState } from "react";
import type React from "react";

const SWIPE_EXIT_PX = 360;

export function useSwipeGesture(params: {
  currentTitleId?: string;
  onSwipeKeep: () => void;
  onSwipePass: () => void;
  swipeTriggerPx?: number;
}) {
  const { currentTitleId, onSwipeKeep, onSwipePass, swipeTriggerPx = 110 } = params;
  const [swipeDeltaX, setSwipeDeltaX] = useState(0);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [isCommitAnimating, setIsCommitAnimating] = useState(false);
  const swipeStartXRef = useRef<number | null>(null);
  const commitDirectionRef = useRef<"keep" | "pass" | null>(null);

  useEffect(() => {
    setSwipeDeltaX(0);
    setIsDraggingCard(false);
    setIsCommitAnimating(false);
    swipeStartXRef.current = null;
    commitDirectionRef.current = null;
  }, [currentTitleId]);

  function onSwipePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (isCommitAnimating) return;
    swipeStartXRef.current = event.clientX;
    setIsDraggingCard(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onSwipePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isDraggingCard || swipeStartXRef.current === null || isCommitAnimating) return;
    setSwipeDeltaX(event.clientX - swipeStartXRef.current);
  }

  function onSwipePointerEnd() {
    if (!isDraggingCard || isCommitAnimating) return;

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

  function triggerButtonSwipe(direction: "keep" | "pass") {
    if (isDraggingCard || isCommitAnimating) return;
    commitDirectionRef.current = direction;
    setIsCommitAnimating(true);
    // Paint at rest first so the transform transition runs on the next frame.
    requestAnimationFrame(() => {
      setSwipeDeltaX(direction === "keep" ? SWIPE_EXIT_PX : -SWIPE_EXIT_PX);
    });
  }

  function onSwipeTransitionEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (!isCommitAnimating || event.propertyName !== "transform") return;
    const direction = commitDirectionRef.current;
    commitDirectionRef.current = null;
    setIsCommitAnimating(false);
    setSwipeDeltaX(0);
    if (direction === "keep") onSwipeKeep();
    else if (direction === "pass") onSwipePass();
  }

  function resetSwipeGesture() {
    setSwipeDeltaX(0);
    setIsDraggingCard(false);
    setIsCommitAnimating(false);
    swipeStartXRef.current = null;
    commitDirectionRef.current = null;
  }

  const effectiveDelta = swipeDeltaX;
  const isAnimatingCard = isDraggingCard || isCommitAnimating;

  return {
    swipeDeltaX: effectiveDelta,
    isDraggingCard,
    isCommitAnimating,
    isAnimatingCard,
    passOverlayOpacity: Math.min(1, Math.max(0, -effectiveDelta / swipeTriggerPx)),
    keepOverlayOpacity: Math.min(1, Math.max(0, effectiveDelta / swipeTriggerPx)),
    onSwipePointerDown,
    onSwipePointerMove,
    onSwipePointerEnd,
    onSwipeTransitionEnd,
    triggerButtonSwipe,
    resetSwipeGesture
  };
}
