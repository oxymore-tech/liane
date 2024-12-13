import * as React from "react";
import { Icon, IconName } from "@/components/base/Icon";
import { Toast } from "flowbite-react";

type ToastProps = {
  message: string;
  icon?: IconName;
  level: "info" | "alert";
};

export function ToastMessage({ icon, message, level }: ToastProps) {
  const color = level === "alert" ? "red" : "blue";
  return (
    <Toast className="z-50 absolute bottom-4 left-0 right-0 ml-auto mr-auto transition animate slide">
      <Icon name={icon ?? level} className={`h-5 w-5 text-${color}-600 dark:text-${color}-500`} />
      <div className="pl-4 text-sm font-normal">{message}</div>
    </Toast>
  );
}
