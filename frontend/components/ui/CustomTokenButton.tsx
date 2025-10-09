// components/ui/CustomTokenButton.tsx
"use client";

import * as React from "react";
import clsx from "clsx";

type CustomTokenButtonProps = {
  title?: string;
  onClick?: () => void;
  className?: string;
  /** If you ever want a different icon, pass it here. Defaults to a plus. */
  icon?: React.ReactNode;
};

export function CustomTokenButton({
  title = "Add custom token",
  onClick,
  className,
  icon,
}: CustomTokenButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={clsx(
        // ~2.5x bigger than 40px: use 96px (w-24 h-24)
        "w-24 h-24 grid place-items-center rounded-xl",
        "border border-white/15 bg-white/5 hover:bg-white/10",
        "text-white/90 transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/20",
        className
      )}
    >
      {icon ?? (
        // Plus icon (no external deps)
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      )}
    </button>
  );
}
