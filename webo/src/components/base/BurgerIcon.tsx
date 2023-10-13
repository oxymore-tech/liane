/* eslint-disable no-mixed-operators */
/* eslint-disable react/require-default-props */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable import/prefer-default-export */
import React from "react";

interface BurgerIconProps {
  open?: boolean;
  onClick?: (e: any) => Promise<void> | void;
}

export function BurgerIcon({ open = false, onClick }: BurgerIconProps) {
  return (
    <div className="w-8 h-6 cursor-pointer relative transition hover:opacity-80" onClick={onClick}>
      <div className={`w-8 h-1 absolute top-0 transition-all rounded duration-300 ${open || "bg-teal-700"}`} />
      <div
        className={`w-8 h-1 absolute transition-all duration-300 rounded bg-teal-700 transform ${open && "top-2 rotate-45" || "top-2"}`}
      />
      <div
        className={`w-8 h-1 absolute transition-all duration-300 rounded bg-teal-700 transform ${open && "top-2 -rotate-45" || "top-4"}`}
      />
    </div>
  );
}
