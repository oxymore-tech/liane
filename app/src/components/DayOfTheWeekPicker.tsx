import React from "react";
import { StyleSheet } from "react-native";

import { DayOfWeekFlag } from "@liane/common";
import { AppLocalization } from "@/api/i18n";

import { Row } from "@/components/base/AppLayout";

import { AppColors } from "@/theme/colors";
import { DayItem } from "@/components/DayItem.tsx";

type DayOfTheWeekPickerProps = {
  selectedDays?: DayOfWeekFlag;
  onChangeDays?: (daysOfTheWeek: DayOfWeekFlag) => void;
  fontSize?: number;
  daysSize?: number;
  borderBottomDisplayed?: boolean;
  enabledDays?: DayOfWeekFlag;
  requiredDays?: DayOfWeekFlag;
  singleOptionMode?: boolean;
  dualOptionMode?: boolean;
};

export const DayOfTheWeekPicker = ({
  selectedDays,
  onChangeDays,
  fontSize,
  daysSize,
  enabledDays,
  requiredDays,
  singleOptionMode = false,
  dualOptionMode = false
}: DayOfTheWeekPickerProps) => {
  const selectedDaysString = selectedDays ?? "0000000";
  const size = daysSize ?? 35;
  const selectDate = (dayIndex: number) => {
    // Set default value if selectedDays are null
    const currentSelectedDays = selectedDays ?? "0000000";
    let newSelectedDays = "";

    AppLocalization.daysList.forEach((_day: string, index: number) => {
      // Replace selected day at selected index
      newSelectedDays +=
        index === dayIndex
          ? replaceSelectedDay(currentSelectedDays.charAt(index))
          : singleOptionMode
          ? "0"
          : dualOptionMode
          ? countAvailableDays(currentSelectedDays) > 1
            ? "0"
            : currentSelectedDays.charAt(index)
          : currentSelectedDays.charAt(index);
    });

    onChangeDays && onChangeDays(newSelectedDays as DayOfWeekFlag);
  };

  const countAvailableDays = (weekdays: string): number => {
    let availableDaysCount = 0;
    for (let i = 0; i < weekdays.length; i++) {
      if (weekdays[i] === "1") {
        availableDaysCount++;
      }
    }

    return availableDaysCount;
  };

  return (
    <Row style={styles.rowContainer} spacing={2}>
      {AppLocalization.daysList.map((day: string, index: number) => (
        <DayItem
          key={day}
          index={index}
          day={day}
          selected={selectedDaysString.charAt(index) === "1"}
          disabled={enabledDays?.charAt(index) === "0"}
          required={requiredDays?.charAt(index) === "1"}
          size={size}
          fontSize={fontSize}
          onSelect={() => onChangeDays && selectDate(index)}
        />
      ))}
    </Row>
  );
};

const replaceSelectedDay = (selectedDay: string) => {
  return selectedDay === "0" ? "1" : "0";
};

const styles = StyleSheet.create({
  rowContainer: {
    flex: 1,
    textAlign: "center",
    justifyContent: "center",
    flexWrap: "wrap"
  },
  containerBorderStyle: {
    borderBottomWidth: 1,
    borderBottomColor: AppColors.lightGrayBackground,
    marginTop: 4
  }
});
