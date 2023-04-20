import { isToday, toTimeInSeconds, withOffsetHours } from "@/util/datetime";
import { Column, Row } from "@/components/base/AppLayout";
import { AppPressable } from "@/components/base/AppPressable";
import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { formatShortMonthDay } from "@/api/i18n";
import React, { useState } from "react";
import { ScrollView, Switch, View } from "react-native";
import { TargetTimeDirection } from "@/api";
import DatePicker from "react-native-date-picker";
import { SwitchToggle } from "@/components/forms/SelectToggleForm";

export const DatePagerSelector = ({
  date,
  onSelectDate,
  formatter
}: {
  date: Date | undefined;
  onSelectDate: (d: Date) => void;
  formatter?: (d: Date) => string;
}) => {
  const dateIsToday = !date || isToday(date);
  const text = formatter ? formatter(date || new Date()) : dateIsToday ? "Aujourd'hui" : formatShortMonthDay(date);
  return (
    <Row style={{ alignItems: "center", justifyContent: "center" }} spacing={8}>
      <AppPressable
        backgroundStyle={{ borderRadius: 8 }}
        style={{ padding: 4 }}
        clickable={!dateIsToday}
        onPress={
          dateIsToday
            ? undefined
            : () => {
                if (onSelectDate) {
                  const previousDay = withOffsetHours(-24, date);
                  const now = new Date();
                  onSelectDate(now > previousDay ? now : previousDay);
                }
              }
        }>
        <AppIcon name={"chevron-left"} color={AppColorPalettes.gray[dateIsToday ? 400 : 800]} />
      </AppPressable>

      <Row style={{ alignItems: "center", justifyContent: "center", paddingVertical: 6 }} spacing={6}>
        <AppIcon name={"calendar-outline"} size={18} />
        <AppText style={{ fontWeight: "bold" }}>{text}</AppText>
      </Row>

      <AppPressable
        style={{ padding: 4 }}
        backgroundStyle={{ borderRadius: 8 }}
        onPress={() => {
          if (onSelectDate) {
            onSelectDate(withOffsetHours(24, date));
            console.debug("next");
          }
        }}>
        <AppIcon name={"chevron-right"} />
      </AppPressable>
    </Row>
  );
};
