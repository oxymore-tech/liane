import React from "react";

export interface ChevronProps {
  open: boolean
}

export function Chevron({ open }: ChevronProps) {
  return (
    <svg
      className={`ml-2 h-6 w-6 text-teal-700 transition-transform transform ${open ? "rotate-0" : "group-hover:rotate-0 -rotate-90"}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}
