import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type ToastProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: ReactNode;
};

export function Toast({ title, description, className, ...props }: ToastProps) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm",
        className
      )}
      role="status"
      {...props}
    >
      <span className="font-semibold text-slate-900">{title}</span>
      {description ? <span className="text-slate-600">{description}</span> : null}
    </div>
  );
}
