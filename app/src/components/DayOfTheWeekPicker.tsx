import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { DayOfWeekFlag } from "@liane/common";
import { AppLocalization } from "@/api/i18n";

import { Row } from "@/components/base/AppLayout";

import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppPressableOverlay } from "@/components/base/AppPressable";

export const DayOfTheWeekPicker = ({
  selectedDays,
  onChangeDays,
  fontSize,
  daysSize,
  borderBottomDisplayed = false
}: {
  selectedDays: DayOfWeekFlag | null;
  onChangeDays: (daysOfTheWeek: DayOfWeekFlag) => void;
  fontSize?: number;
  daysSize?: number;
  borderBottomDisplayed?: boolean;
}) => {
  const selectedDaysString = selectedDays ?? "0000000";
  const size = daysSize ?? 35;
  return (
    <View>
      <Row style={styles.rowContainer} spacing={6}>
        {AppLocalization.daysList.map((day: string, index: number) => (
          <AppPressableOverlay
            key={index}
            onPress={() => selectDate(index, onChangeDays, selectedDaysString)}
            backgroundStyle={[
              styles.dayContainer,
              selectedDaysString?.charAt(index) === "1" ? styles.daySelectedContainer : null,
              { borderRadius: size }
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

const selectDate = (dayIndex: number, onChangeDays: (daysOfTheWeek: DayOfWeekFlag) => void, selectedDays: DayOfWeekFlag) => {
  // Set default value if selectedDays are null
  const currentSelectedDays = selectedDays ?? "0000000";
  let newSelectedDays = "";

  AppLocalization.daysList.forEach((_day: string, index: number) => {
    // Replace selected day at selected index
    newSelectedDays += index === dayIndex ? replaceSelectedDay(currentSelectedDays.charAt(index)) : currentSelectedDays.charAt(index);
  });

  onChangeDays(newSelectedDays as DayOfWeekFlag);
};

const replaceSelectedDay = (selectedDay: string) => {
  return selectedDay === "0" ? "1" : "0";
};

const styles = StyleSheet.create({
  rowContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    textAlign: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    rowGap: 4
  },
  dayContainer: {
    //marginHorizontal: 6,
    textAlign: "center",
    justifyContent: "center",
    borderColor: AppColorPalettes.gray[600],
    borderWidth: 2,
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
