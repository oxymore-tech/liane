import React from "react";

interface LabelProps {
  label?: string;
  className?: string;
  required?: boolean;
}

export function Label({ label, className, required }: LabelProps) {
  if (!label) {
    return <></>;
  }
  return (
    <label className={`text-lg text-gray-700 font-semibold ${className}`} title={required && "Champ obligatoire"}>
      {label}
      {required && <span className="ml-1 text-gray-400 text-xs">(obligatoire)</span>}
    </label>
  );
}
