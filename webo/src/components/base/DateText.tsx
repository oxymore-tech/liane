import React, { memo } from "react";
import { format, parseJSON } from "date-fns";
import { fr } from "date-fns/locale";

interface DateTextProps {
  className?: string;
  value?: string | number | Date;
}

export function DateTextComponent({ className, value }: DateTextProps) {
  return <span className={className}>{format(value ? parseJSON(value) : new Date(), "dd/MM/yyyy", { locale: fr })}</span>;
}

export const DateText = memo(DateTextComponent);
