"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type StickScrollProps = {
  children: ReactNode;
};

export function StickScroll({ children }: StickScrollProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    if (!isAtBottom) {
      return;
    }

    viewportRef.current?.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [children, isAtBottom]);

  function handleScroll() {
    const node = viewportRef.current;

    if (!node) {
      return;
    }

    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    setIsAtBottom(distance < 48);
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border" role="log">
      <div
        ref={viewportRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-auto"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        <div className="flex min-h-full flex-col gap-8 p-4">{children}</div>
      </div>
      {!isAtBottom && (
        <button
          type="button"
          onClick={() =>
            viewportRef.current?.scrollTo({
              top: viewportRef.current.scrollHeight,
              behavior: "smooth",
            })
          }
          className="absolute bottom-4 left-1/2 flex size-11 -translate-x-1/2 items-center justify-center rounded-full border bg-background text-xl shadow-sm hover:bg-muted"
          aria-label="Scroll to bottom"
        >
          ↓
        </button>
      )}
    </div>
  );
}
