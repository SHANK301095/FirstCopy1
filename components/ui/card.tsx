import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Card({ className, ...props }: CardProps) {
  return <div className={clsx("rounded-2xl border border-slate-200 bg-white p-6", className)} {...props} />;
}
