"use client";
import React from "react";

type Props = {
  /** 0–100; percent height of the liquid fill */
  fill?: number;
  /** top offset to clear fixed nav/search bars */
  topOffsetPx?: number;
};

export function LiquidScrollbar({ fill = 97, topOffsetPx = 0 }: Props) {
  // clamp
  const pct = Math.max(0, Math.min(100, fill));
  return (
    <div
      className="pointer-events-none fixed right-2 md:right-3 z-[60] hidden sm:flex"
      style={{
        top: topOffsetPx,
        bottom: 12,
      }}
    >
      <div className="liquid-scrollbar">
        <div
          className="liquid-fill"
          style={{ height: `${pct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
