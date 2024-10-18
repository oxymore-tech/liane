import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { DayOfWeekFlag } from "@liane/common";
import { AppLocalization } from "@/api/i18n";

import { Row } from "@/components/base/AppLayout";

import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppPressableOverlay } from "@/components/base/AppPressable";

type DayOfTheWeekPickerProps = {
  selectedDays?: DayOfWeekFlag;
  onChangeDays?: (daysOfTheWeek: DayOfWeekFlag) => void;
  fontSize?: number;
  daysSize?: number;
  borderBottomDisplayed?: boolean;
  enabledDays?: DayOfWeekFlag;
  singleOptionMode?: boolean;
  dualOptionMode?: boolean;
};

export const DayOfTheWeekPicker = ({
  selectedDays,
  onChangeDays,
  fontSize,
  daysSize,
  enabledDays,
  borderBottomDisplayed = false,
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
    <View>
      <Row style={styles.rowContainer} spacing={6}>
        {AppLocalization.daysList.map((day: string, index: number) => (
          <AppPressableOverlay
            disabled={!onChangeDays || enabledDays?.charAt(index) === "0"}
            key={index}
            onPress={() => onChangeDays && selectDate(index)}
            backgroundStyle={[
              styles.dayContainer,
              selectedDaysString?.charAt(index) === "1" ? styles.daySelectedContainer : null,
              { borderRadius: size },
              !!enabledDays && enabledDays.charAt(index) === "0" ? { borderColor: AppColorPalettes.gray[300] } : {}
            ]}
            style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            <Text
              style={[
                styles.textContainer,
                selectedDaysString?.charAt(index) === "1" ? styles.textSelectedContainer : null,
                { fontSize: fontSize ?? 16 }
              ]}>
              {day.substring(0, 2)}
            </Text>
          </AppPressableOverlay>
        ))}
      </Row>
      {borderBottomDisplayed && <View style={styles.containerBorderStyle} />}
    </View>
  );
};

const replaceSelectedDay = (selectedDay: string) => {
  return selectedDay === "0" ? "1" : "0";
};

const styles = StyleSheet.create({
  rowContainer: {
    paddingVertical: 8,
    textAlign: "center",
    justifyContent: "center",
    flexWrap: "wrap"
  },
  dayContainer: {
    textAlign: "center",
    justifyContent: "center",
    borderColor: AppColorPalettes.gray[600],
    borderWidth: 1,
    borderRadius: 20
  },
  daySelectedContainer: {
    borderColor: AppColors.primaryColor,
    backgroundColor: AppColors.primaryColor
  },
  textContainer: {
    color: AppColorPalettes.gray[600],
    textAlign: "center"
  },
  textSelectedContainer: {
    color: AppColors.white
  },
  containerBorderStyle: {
    borderBottomWidth: 1,
    borderBottomColor: AppColors.lightGrayBackground,
    marginHorizontal: 52,
    marginTop: 4
  }
});
