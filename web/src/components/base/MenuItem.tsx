import React, { ReactNode } from "react";
import Link from "next/link";

interface MenuItemProps {
  href?: string;
  className?: string;
  size?: "text-xs" | "text-sm" | "text-base";
  text?: string;
  children?: ReactNode;
  onClick?: () => void;
  onEnter?: () => void;
  onLeave?: () => void;
  transparent?: boolean;
}

export function MenuItem({
  size,
  transparent,
  className,
  text,
  children,
  href,
  onClick,
  onEnter,
  onLeave
}: MenuItemProps) {

  const s = size || "text-base";

  const onEnterInternal = () => {
    onEnter && onEnter();
  };

  const onLeaveInternal = () => {
    onLeave && onLeave();
  };

  const a = (
    <a
      className={`${s} ${transparent ? "text-gray-200 hover:text-white" : "text-gray-500 hover:text-gray-900"} cursor-pointer ${className}`}
      onMouseEnter={onEnterInternal}
      onMouseLeave={onLeaveInternal}
      onClick={onClick}
    >
      {children || text}
    </a>
  );
  if (href) {
    return <Link href={href}>{a}</Link>;
  }

  return a;
}