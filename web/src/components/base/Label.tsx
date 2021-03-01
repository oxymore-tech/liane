import React from "react";

interface LabelProps {
  label?: string;
  mandatory?: boolean;
}

export function Label({label, mandatory}: LabelProps) {
  if (!label) {
    return <></>;
  }
  return <label className="text-lg text-black font-bold" title={mandatory && "Champ obligatoire"}>
    {label}{mandatory && <span className="ml-1 text-gray-400 text-xs">(obligatoire)</span>}
  </label>;
}
