import * as React from "react";
import { cn } from "@/lib/utils";

export type ChipVariant = "static" | "tristate";
export type TristateValue = "off" | "on" | "mixed";

export interface ChipProps {
  variant?: ChipVariant;
  value?: TristateValue;
  onChange?: (next: TristateValue) => void;
  children: React.ReactNode;
  className?: string;
}

const cycle: Record<TristateValue, TristateValue> = {
  off: "on",
  on: "mixed",
  mixed: "off",
};

// Static lookup maps — avoid Tailwind class string interpolation purge risk
const tristateWrapperClasses: Record<TristateValue, string> = {
  off: "bg-raised border-border-2 text-ink-2",
  on: "bg-accent/10 border-accent text-accent",
  mixed: "bg-raised border-border-2 text-ink-3",
};

const tristateIndicatorClasses: Record<TristateValue, string> = {
  off: "border border-border-3 rounded-full",
  on: "bg-accent rounded-full",
  mixed: "border border-dashed border-border-3 rounded-full",
};

export function Chip({
  variant = "static",
  value = "off",
  onChange,
  children,
  className,
}: ChipProps) {
  if (variant === "tristate") {
    const handleClick = () => {
      onChange?.(cycle[value]);
    };

    return (
      <div
        role="button"
        tabIndex={0}
        data-tristate
        data-tristate-value={value}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        className={cn(
          "inline-flex items-center gap-1.5 h-6 px-2.5 rounded-[12px] border cursor-pointer select-none text-[10px] font-semibold transition-colors duration-100",
          tristateWrapperClasses[value],
          className,
        )}
      >
        <span
          aria-hidden
          className={cn("inline-block w-[5px] h-[5px] shrink-0", tristateIndicatorClasses[value])}
        />
        {children}
      </div>
    );
  }

  // Static variant
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-5 px-2.5 rounded-[10px] bg-raised border border-border-2 text-ink-2 text-[10px] font-semibold select-none",
        className,
      )}
    >
      {children}
    </span>
  );
}
