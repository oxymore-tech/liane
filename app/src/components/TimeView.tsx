import React from "react";
import { AppText, AppTextProps } from "@/components/base/AppText";
import { TimeInSeconds } from "@/util/datetime";
import { locale } from "@/api/i18n";

export interface TimeViewProps extends AppTextProps {
  value: TimeInSeconds;
}
const time24hFormatter = new Intl.DateTimeFormat(locale, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});
export function TimeView({ value, ...props }: TimeViewProps) {
  return <AppText {...props}>{value ? time24hFormatter.format(new Date(value! * 1000)) : "--:--"}</AppText>;
}
