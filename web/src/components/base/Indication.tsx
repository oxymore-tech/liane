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
    super("success", message);
  }

}

export class InfoMessage extends IndicationMessage {

  constructor(message: string) {
    super("info", message);
  }

}

export class ErrorMessage extends IndicationMessage {

  constructor(message: string) {
    super("error", message);
  }

}

export function getIndicationRingColor(indication?: IndicationMessage) {
  if (!indication) {
    return "ring-gray-300";
  }
  switch (indication.status) {
    default:
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

export function getIndicationColor(indication?: IndicationMessage) {
  if (!indication) {
    return "";
  }
  switch (indication.status) {
    default:
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

export function getIndicationIcon(indication?: IndicationMessage) {
  if (!indication) {
    return "";
  }
  switch (indication.status) {
    default:
    case undefined:
    case "info":
      return "mdi-lightbulb-on-outline";
    case "success":
      return "mdi-check";
    case "warning":
      return "mdi-check";
    case "error":
      return "mdi-spider-thread";
  }
}

export function Indication({
  className, value, duration = 5000, notify = false
}: IndicationProps) {
  const [messageInternal, setMessageInternal] = useState(value?.message);

  const indicationColor = getIndicationColor(value);

  useEffect(() => {
    setMessageInternal(value?.message);
    if (notify) {
      const timer = setTimeout(() => setMessageInternal(undefined), duration);
      return () => {
        clearTimeout(timer);
      };
    }
    return () => {
    };
  }, [notify, value]);

  return (
    <div
      className={
        `text-xs ease-in-out duration-500 transition-all flex items-center 
        ${messageInternal ? "opacity-100" : "opacity-0 invisible"} ${indicationColor} ${className}`
      }
    >
      {notify && <i className={`mx-2 mdi text-xs ${getIndicationIcon(value)}`} />}
      <p>{messageInternal || value?.message || "\u00A0"}</p>
    </div>
  );
}
