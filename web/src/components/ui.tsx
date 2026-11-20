import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Logo, Mascot } from "./brand";
import { cn } from "./utils";

const VARIANTS = {
  primary: "bg-liane text-white hover:opacity-90",
  key: "bg-pousse text-liane hover:opacity-90",
  secondary: "border border-liane bg-white text-liane hover:bg-pale",
  danger: "border border-rouge bg-white text-rouge hover:bg-pierre",
  quiet: "rounded-none px-0 text-liane underline",
};

type Variant = keyof typeof VARIANTS;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export const buttonClass = (variant: Variant = "primary") =>
  cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-center text-base font-semibold transition-opacity disabled:opacity-50",
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

export const linkClass = "font-semibold text-liane underline";

export const headerClass =
  "flex min-h-14 items-center gap-3 border-b border-bordure bg-white px-4 py-2";

export const backLinkClass =
  "flex min-h-11 shrink-0 items-center font-semibold text-liane underline";

export function PageHeader({
  title,
  backHref,
  backLabel,
}: {
  title: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <header className={cn(headerClass, "sticky top-0 z-10")}>
      <Link href={backHref} className={backLinkClass}>
        ← {backLabel}
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-lg font-extrabold">
        {title}
      </h1>
      <span aria-hidden="true" className="hidden shrink-0 sm:block">
        <Logo className="h-5" />
      </span>
    </header>
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
    <main className="flex-1 overflow-y-auto bg-pierre text-encre">
      <PageHeader title={title} backHref={backHref} backLabel={backLabel} />
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4 pb-8 lg:max-w-2xl lg:py-6">
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
        "rounded-card border border-bordure bg-white p-4",
        className,
      )}
    >
      {children}
    </section>
  );
}

const NOTICE_TONES = {
  error: "border border-rouge bg-white text-rouge",
  warning: "border-l-4 border-jaune bg-jaune-pale text-encre",
  info: "bg-pale text-liane",
};

export function Notice({
  tone = "error",
  className,
  children,
}: {
  tone?: keyof typeof NOTICE_TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "rounded-field px-3 py-2 text-sm",
        NOTICE_TONES[tone],
        className,
      )}
    >
      {children}
    </p>
  );
}

const BADGE_TONES = {
  pale: "bg-pale text-liane",
  selected: "bg-pousse text-liane",
  neutral: "bg-pierre text-gris",
  warning: "bg-jaune-pale text-encre",
  urgent: "border-2 border-orange bg-white text-encre",
  danger: "border border-rouge bg-white text-rouge",
};

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({
  tone = "pale",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** La mascotte à côté d'un message : états vides, accueil de la connexion. */
export function MascotNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex items-center gap-4 rounded-card bg-pale p-4 text-liane",
        className,
      )}
    >
      <Mascot />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
        {children}
      </div>
    </section>
  );
}

export function Tabs({
  tabs,
  isCurrent,
}: {
  tabs: { href: string; label: string }[];
  isCurrent: (href: string) => boolean;
}) {
  return (
    <nav className="flex gap-1 rounded-full border border-bordure bg-white p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={isCurrent(tab.href) ? "page" : undefined}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-center rounded-full px-2 text-center text-sm font-semibold",
            isCurrent(tab.href) ? "bg-pousse text-liane" : "text-gris",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** Choix à bascule (jour, sens) : vert pousse quand il est retenu. */
export const toggleClass = (selected: boolean) =>
  cn(
    "min-h-11 rounded-field border text-sm font-semibold",
    selected
      ? "border-liane bg-pousse text-liane"
      : "border-bordure bg-white text-gris",
  );

export const labelClass = "text-sm font-medium";

export const fieldClass =
  "mt-1 block w-full min-h-11 rounded-field border border-bordure bg-white px-3 py-2 text-base text-encre";

export const checkboxClass = "h-5 w-5 accent-liane";

export const listClass = "flex flex-col divide-y divide-bordure";

/** Liste de propositions sous un champ de recherche. */
export const suggestionsClass =
  "mt-1 divide-y divide-bordure overflow-hidden rounded-field border border-bordure bg-white";

export const sectionTitleClass = "px-1 text-lg font-bold";

export const mutedClass = "text-sm text-gris";
