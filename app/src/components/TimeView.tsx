import React from "react";
import { AppText, AppTextProps } from "@/components/base/AppText";
import { locale } from "@/api/i18n";
import { UTCDateTime } from "@/api";

export interface TimeViewProps extends AppTextProps {
  value: UTCDateTime;
}
const time24hFormatter = new Intl.DateTimeFormat(locale, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});
export function TimeView({ value, ...props }: TimeViewProps) {
  return <AppText {...props}>{value ? time24hFormatter.format(new Date(value)) : "--:--"}</AppText>;
}
