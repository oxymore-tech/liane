import React from "react";
import { View } from "react-native";
import { AppText } from "@/components/base/AppText";
import { TimeOnly } from "@/api";

export type TimeProps = {
  value?: TimeOnly;
};

export function Time({ value }: TimeProps) {
  const hour = value?.hour?.toString()?.padStart(2, "0") ?? "--";
  const minute = value?.minute?.toString()?.padStart(2, "0") ?? "--";
  return (
    <View>
      <AppText className="text-gray-500">{`${hour}:${minute}`}</AppText>
    </View>
  );
}
