import React from "react";
import { AppText, AppTextProps } from "@/components/base/AppText";
import { AppLocalization } from "@/api/i18n";
import { UTCDateTime } from "@liane/common";

export interface TimeViewProps extends AppTextProps {
  value: UTCDateTime;
}

export function TimeView({ value, ...props }: TimeViewProps) {
  return <AppText {...props}>{value ? AppLocalization.formatTime24h(new Date(value)) : "--:--"}</AppText>;
}
