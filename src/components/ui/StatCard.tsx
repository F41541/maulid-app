import React from "react";
import { cn } from "@/lib/utils";

export type StatCardColor =
  | "emerald"
  | "purple"
  | "blue"
  | "teal"
  | "amber"
  | "rose"
  | "slate";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ElementType;
  iconColor?: StatCardColor;
  animationDelayMs?: number;
  compact?: boolean;
}

const colorStyles: Record<
  StatCardColor,
  { iconBox: string; iconText: string; titleText?: string }
> = {
  emerald: {
    iconBox: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400",
    iconText: "text-emerald-600 dark:text-emerald-400",
  },
  purple: {
    iconBox: "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400",
    iconText: "text-purple-600 dark:text-purple-400",
  },
  blue: {
    iconBox: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400",
    iconText: "text-blue-600 dark:text-blue-400",
  },
  teal: {
    iconBox: "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400",
    iconText: "text-teal-600 dark:text-teal-400",
  },
  amber: {
    iconBox: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
    iconText: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    iconBox: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400",
    iconText: "text-rose-600 dark:text-rose-400",
  },
  slate: {
    iconBox: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
    iconText: "text-slate-600 dark:text-slate-300",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "slate",
  animationDelayMs,
  compact = false,
  className,
  style,
  ...props
}: StatCardProps) {
  const color = colorStyles[iconColor];

  return (
    <div
      style={{
        ...(animationDelayMs ? { animationDelay: `${animationDelayMs}ms` } : {}),
        ...style,
      }}
      className={cn(
        "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs",
        "flex items-center justify-between group transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        animationDelayMs ? "animate-stagger-item" : "",
        compact ? "p-4" : "p-5",
        className
      )}
      {...props}
    >
      <div className="min-w-0 flex-1 pr-3">
        <span
          className={cn(
            "font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 block truncate",
            compact ? "text-[11px]" : "text-xs"
          )}
        >
          {title}
        </span>
        <h3
          className={cn(
            "font-bold text-slate-900 dark:text-white mt-1 tracking-tight truncate",
            compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
          )}
        >
          {value}
        </h3>
        {subtitle && (
          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {subtitle}
          </div>
        )}
      </div>

      {Icon && (
        <div
          className={cn(
            "rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-2xs",
            compact ? "w-10 h-10 rounded-xl" : "w-12 h-12",
            color.iconBox
          )}
        >
          <Icon className={cn(compact ? "w-5 h-5" : "w-6 h-6")} />
        </div>
      )}
    </div>
  );
}
