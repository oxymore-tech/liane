import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "quiet";
};

const VARIANTS = {
  primary: "bg-emerald-600 text-white hover:bg-emerald-700",
  secondary: "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50",
  danger: "bg-white text-red-700 border border-red-300 hover:bg-red-50",
  quiet: "text-gray-500 underline hover:text-gray-700 px-0 py-0 min-h-0",
};

export const buttonClass = (variant: keyof typeof VARIANTS = "primary") =>
  cn(
    "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-base font-semibold transition-colors disabled:opacity-50",
    VARIANTS[variant],
  );

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(buttonClass(variant), className)}
    />
  );
}

export function Page({
  title,
  backHref = "/",
  backLabel = "Carte",
  children,
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex-1 overflow-y-auto bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link href={backHref} className="text-emerald-700 font-semibold">
          ← {backLabel}
        </Link>
        <h1 className="truncate text-lg font-bold">{title}</h1>
      </header>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
        {children}
      </div>
    </main>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      {children}
    </p>
  );
}

export const fieldClass =
  "mt-1 block w-full min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base";
