import type { HTMLAttributes } from "react";
import clsx from "clsx";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("animate-pulse rounded-xl bg-slate-200", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
