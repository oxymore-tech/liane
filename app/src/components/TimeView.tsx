import React from "react";
import { AppText, AppTextProps } from "@/components/base/AppText";
import { TimeOnly } from "@/api";

export interface TimeViewProps extends AppTextProps {
  value?: TimeOnly;
}

const padNumber = (value: number) => value.toString().padStart(2, "0");

export function TimeView({ value, ...props }: TimeViewProps) {
  let hour;
  let minute;
  if (value) {
    hour = padNumber(Math.floor(value / 3600));
    minute = padNumber(Math.floor((value / 60) % 60));
  }
  return (

    <AppText {...props}>{`${hour ?? "--"}:${minute ?? "--"}`}</AppText>

  );
}