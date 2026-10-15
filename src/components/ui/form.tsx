import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const controlClasses = cn(
  "block w-full rounded-lg border border-input bg-card px-3 text-base text-foreground",
  "placeholder:text-muted-foreground",
  "focus:border-ring focus:outline-2 focus:outline-offset-0 focus:outline-ring/30",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-[invalid=true]:border-destructive",
);

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClasses, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClasses, "min-h-24 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlClasses, "h-11", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-foreground text-sm font-medium", className)} {...props} />;
}

/**
 * Label + Eingabe + Hinweis/Fehler. Die Eingabe wird als children übergeben und sollte
 * `id={id}` sowie bei Fehler `aria-invalid` und `aria-describedby={`${id}-error`}` setzen.
 */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | string[];
  children: ReactNode;
  className?: string;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !message ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-sm">
          {hint}
        </p>
      ) : null}
      {message ? (
        <p id={`${id}-error`} className="text-destructive text-sm" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
