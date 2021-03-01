import React, { ReactNode } from "react";
import Link from "next/link";
import { Loading } from "./Loading";

type Colors = "yellow" | "blue" | "red" | "green";

interface ButtonProps {
  outline?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  title?: string;
  color?: Colors;
  type?: "submit" | "button" | "reset";
  href?: string;
  label?: string;
  children?: ReactNode;
  onClick?: (e: any) => Promise<void> | void;
}

function getColorsClassName(color: Colors, outline: boolean,disabled: boolean) {
  if (disabled) {
    return outline 
      ? "text-gray-400 border-gray-400" 
      : "text-gray-500 bg-gray-300";
  }
  if (outline) {
    switch (color) {
      default:
      case "blue":
        return "text-blue-500 border-blue-500 hover:text-white hover:bg-blue-500";

      case "yellow":
        return "text-yellow-500 border-yellow-500 hover:text-white hover:bg-yellow-500";

      case "green":
        return "text-green-500 border-green-500 hover:text-white hover:bg-green-500";

      case "red":
        return "text-red-500 border-red-500 hover:text-white hover:bg-red-500";
    } 
  }
  switch (color) {
    default:
    case "blue":
      return "text-white bg-blue-500 hover:bg-blue-600";

    case "yellow":
      return "text-white bg-yellow-500 hover:bg-yellow-600";

    case "green":
      return "text-white bg-green-500 hover:bg-green-600";

    case "red":
      return "text-white bg-red-500 hover:bg-red-600";
  }
}

export function Button({
                         outline = false,
                         disabled,
                         loading,
                         className,
                         title,
                         color = "blue",
                         href,
                         label,
                         type = "button",
                         onClick,
                         children
                       }: ButtonProps) {

  const d = disabled || loading || false;

  const colors = getColorsClassName(color, outline, disabled);
  const cl = `outline-none whitespace-nowrap inline-flex items-center justify-center text-sm font-extrabold px-4 py-2 border border-transparent rounded-sm shadow-sm font-medium  ${d && "cursor-not-allowed"} ${colors} ${className}`;

  const child = <Loading loading={loading}>{children || label}</Loading>;

  if (href) {
    if (d) {
      return <a
        title={title}
        className={cl}>{child}</a>;
    } else {
      return <Link href={href}>
        <a
          title={title}
          className={cl}>{child}</a>
      </Link>;
    }
  } else {
    return <button
      title={title}
      disabled={d}
      className={cl}
      type={type}
      onClick={(e) => {
        if (!d && onClick) {
          return onClick(e);
        }
      }}>{child}</button>;
  }
}
