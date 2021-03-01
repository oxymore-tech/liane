import React, { useEffect, useState } from "react";

export abstract class IndicationMessage {
  status?: "info" | "success" | "warning" | "error";
  message?: string;

  protected constructor(status: "info" | "success" | "warning" | "error", message: string) {
    this.status = status;
    this.message = message;
  }
}

export interface IndicationProps {
  value?: IndicationMessage;
  duration?: number;
  className?: string;
  notify?: boolean;
}

export class SuccessMessage extends IndicationMessage {

  constructor(message: string) {
    super("success", message)
  }

}

export class InfoMessage extends IndicationMessage {

  constructor(message: string) {
    super("info", message)
  }

}

export class ErrorMessage extends IndicationMessage {

  constructor(message: string) {
    super("error", message)
  }

}

export function getIndicationRingColor(indication: IndicationMessage) {
  if (!indication) {
    return "";
  }
  switch (indication.status) {
    case undefined:
    case "success":
      return "ring-green-500";
    case "info":
      return "ring-blue-400";
    case "warning":
      return "text-yellow-600";
    case "error":
      return "ring-red-500";
  }
}

export function getIndicationColor(indication: IndicationMessage) {
  if (!indication) {
    return "";
  }
  switch (indication.status) {
    case undefined:
    case "info":
      return "text-blue-400";
    case "success":
      return "text-green-600";
    case "warning":
      return "text-yellow-600";
    case "error":
      return "text-red-500";
  }
}

export function Indication({className, value, duration = 5000, notify = false}: IndicationProps) {
  const [messageInternal, setMessageInternal] = useState(value?.message);

  const indicationColor = getIndicationColor(value);

  useEffect(() => {
    setMessageInternal(value?.message);
    if (notify) {
      setTimeout(() => setMessageInternal(null), duration);
    }
  }, [notify, value]);

  return <div
    className={`text-xs ease-in-out duration-500 transition-all text-gray-600 flex items-center ${messageInternal && "opacity-100" || "opacity-0 invisible"} ${indicationColor} ${className}`}>
    {notify && <i className="mr-2 mdi text-2xl mdi-check-circle"/>}
    {messageInternal || value?.message || "&nbsp;"}
  </div>
}
