import React, { ReactNode } from "react";
import { Arrow } from "./Arrow";


interface ParentMenuItemProps {
  className?: string;
  text: string;
  open: boolean;
  children: ReactNode;
  onOpenChange: (boolean) => void;
  transparent?: boolean;
}

export function ParentMenuItem({transparent, className, text, children, open, onOpenChange}: ParentMenuItemProps) {

  const openPostMenu = () => {
    onOpenChange(true);
  };

  const closePostMenu = () => {
    onOpenChange(false);
  };

  return <div
    className={`relative group rounded-md ${transparent ? "text-gray-200 hover:text-white" : "text-gray-500 hover:text-gray-900"}  ${className}`}>
    <button type="button"
            onMouseEnter={openPostMenu}
            className={`inline-flex items-center text-base font-medium focus:outline-none`}>
      <span>{text}</span>
      {children && <Arrow/>}
    </button>

    <div
      className={`z-20 absolute transform mt-3 px-2 w-screen max-w-md sm:px-0 transition-opacity duration-300 ${!open && 'opacity-0 invisible'}`}
      onMouseLeave={closePostMenu}
      onClick={closePostMenu}
    >
      <div className="rounded-lg shadow-lg ring-1 ring-gray-50 ring-opacity-5 overflow-hidden">
        <div className="px-5 py-5 bg-white sm:px-8 sm:py-8">
          {children}
        </div>
      </div>
    </div>
  </div>;
}