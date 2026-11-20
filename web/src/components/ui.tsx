import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Logo, Mascot } from "./brand";
import { cn } from "./utils";

const VARIANTS = {
  primary:
    "bg-liane text-white not-disabled:hover:opacity-90 not-disabled:active:opacity-80",
  key: "bg-pousse text-liane not-disabled:hover:opacity-90 not-disabled:active:opacity-80",
  secondary:
    "border border-liane bg-white text-liane not-disabled:hover:bg-pale not-disabled:active:bg-pousse",
  danger:
    "border border-rouge bg-white text-rouge not-disabled:hover:bg-pierre not-disabled:active:bg-bordure",
  destructive:
    "bg-rouge text-white not-disabled:hover:opacity-90 not-disabled:active:opacity-80",
  quiet:
    "rounded-none px-0 text-liane underline underline-offset-2 not-disabled:hover:decoration-2",
};

type Variant = keyof typeof VARIANTS;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  /** L'action est en cours : le bouton le montre et ne peut pas être recliqué. */
  loading?: boolean;
};

export const buttonClass = (variant: Variant = "primary") =>
  cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-center text-base font-semibold transition-[opacity,background-color] disabled:opacity-50",
    VARIANTS[variant],
  );

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClass(variant), className)}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {children}
    </button>
  );
}

export const linkClass =
  "font-semibold text-liane underline underline-offset-2 hover:decoration-2";

/** Chevron des éléments qui s'ouvrent ou qui mènent ailleurs. */
export function Chevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5 shrink-0 text-liane", className)}
    >
      <path d="M5 7.5l5 5 5-5" />
    </svg>
  );
}

export const headerClass =
  "flex min-h-14 items-center gap-3 border-b border-bordure bg-white px-4 py-2";

export const backLinkClass =
  "flex min-h-11 shrink-0 items-center font-semibold text-liane underline underline-offset-2 hover:decoration-2";

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
  success: "bg-pale font-semibold text-liane",
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
      role={
        tone === "error" ? "alert" : tone === "success" ? "status" : undefined
      }
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
            isCurrent(tab.href)
              ? "bg-pousse text-liane"
              : "text-gris hover:bg-pale hover:text-liane",
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
    "min-h-11 rounded-field border text-sm font-semibold transition-colors",
    selected
      ? "border-liane bg-pousse text-liane"
      : "border-gris/60 bg-white text-gris hover:border-liane hover:bg-pale hover:text-liane",
  );

export const labelClass = "block text-base font-medium";

export const fieldClass =
  "mt-1 block w-full min-h-11 rounded-field border border-gris/60 bg-white px-3 py-2 text-base text-encre transition-colors hover:border-gris focus:border-liane disabled:bg-pierre disabled:text-gris aria-invalid:border-rouge";

/** Message d'erreur placé sous son champ, que le champ désigne par `aria-describedby`. */
export function FieldError({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <p id={id} role="alert" className="mt-1 text-sm font-medium text-rouge">
      {children}
    </p>
  );
}

/** Panneau flottant des listes déroulantes et des suggestions. */
export const floatingClass =
  "z-50 rounded-field border border-liane bg-white py-1 text-encre focus:outline-none";

/** Une ligne d'un panneau flottant : survol, focus clavier et choix retenu se voient. */
export const optionClass =
  "group flex min-h-11 items-center gap-2 px-3 py-2 text-base data-focus:bg-pale";

export const checkboxClass = "h-5 w-5 accent-liane";

export const listClass = "flex flex-col divide-y divide-bordure";

export const sectionTitleClass = "px-1 text-lg font-bold";

export const mutedClass = "text-sm text-gris";
