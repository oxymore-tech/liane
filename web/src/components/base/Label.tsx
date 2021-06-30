import React, { ReactNode } from "react";

interface LabelProps {
  label?: string;
  children?: ReactNode;
  className?: string;
  required?: boolean;
  error?: boolean;
}

export function Label({ label, children, className = "", required, error }: LabelProps) {
  if (!(children || label)) {
    return <></>;
  }
  return (
    <label className={`${className} font-semibold text-md flex items-center ${error ? "text-red-700" : "text-gray-900"}`} title={required ? "Champ obligatoire" : undefined}>
      {children || label}
      {required && <span className="ml-1 text-gray-400 text-xs">(obligatoire)</span>}
    </label>
  );
}
