import React, { ReactNode } from "react";

interface LabelProps {
  label?: string;
  children?: ReactNode;
  className?: string;
  required?: boolean;
}

export function Label({ label, children, className, required }: LabelProps) {
  if (!(children || label)) {
    return <></>;
  }
  return (
    <div className={`text-base text-gray-500 font-semibold ${className}`} title={required ? "Champ obligatoire" : undefined}>
      {children || label}
      {required && <span className="ml-1 text-gray-400 text-xs">(obligatoire)</span>}
    </div>
  );
}
