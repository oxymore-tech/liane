import * as React from "react";
import { Icon, IconName } from "@/components/base/Icon";

export type IconButtonProps = {
  icon: IconName;
} & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;

export function IconButton({ className, icon, ...props }: IconButtonProps) {
  return (
    <button
      className={`inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white ${className}`}
      type="button"
      {...props}>
      <Icon name={icon} className={"w-5 h-5"} />
    </button>
  );
}
