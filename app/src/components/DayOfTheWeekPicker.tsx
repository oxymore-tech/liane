import { DayOfTheWeekFlag } from "@/api";
import React from "react";
import { StyleSheet, Text, TouchableWithoutFeedback, View } from "react-native";
import { Row } from "./base/AppLayout";
import { AppColors } from "@/theme/colors";
import { daysList } from "@/api/i18n";

export const DayOfTheWeekPicker = ({
  selectedDays,
  onChangeDays,
  fontSize,
  daysSize
}: {
  selectedDays: DayOfTheWeekFlag;
  onChangeDays: (daysOfTheWeek: DayOfTheWeekFlag) => void;
  fontSize?: number;
  daysSize?: number;
}) => {
  return (
    <View>
      <Row style={styles.rowContainer}>
        {daysList.map((day: string, index: number) => (
          <View
            key={day}
            style={[
              styles.dayContainer,
              selectedDays?.charAt(index) === "1" ? styles.daySelectedContainer : null,
              { width: daysSize ?? 50, height: daysSize ?? 50, borderRadius: daysSize ? daysSize / 2 : 25 }
            ]}>
            <TouchableWithoutFeedback onPress={() => selectDate(index, onChangeDays, selectedDays)}>
              <Text
                style={[
                  styles.textContainer,
                  selectedDays?.charAt(index) === "1" ? styles.textSelectedContainer : null,
                  { fontSize: fontSize ?? 18 }
                ]}>
                {day.substring(0, 2)}
              </Text>
            </TouchableWithoutFeedback>
          </View>
        ))}
      </Row>
    </View>
  );
};

const selectDate = (dayIndex: number, onChangeDays: (daysOfTheWeek: DayOfTheWeekFlag) => void, selectedDays: DayOfTheWeekFlag) => {
  // Set default value if selectedDays are null
  const currentSelectedDays = selectedDays ?? "0000000";
  let newSelectedDays = "";

  daysList.forEach((_day: string, index: number) => {
    // Replace selected day at selected index
    newSelectedDays += index === dayIndex ? replaceSelectedDay(currentSelectedDays.charAt(index)) : currentSelectedDays.charAt(index);
  });

  onChangeDays(newSelectedDays as DayOfTheWeekFlag);
};

const replaceSelectedDay = (selectedDay: string) => {
  return selectedDay === "0" ? "1" : "0";
};

const styles = StyleSheet.create({
  rowContainer: {
    padding: 2,
    textAlign: "center",
    justifyContent: "center"
  },
  dayContainer: {
    marginHorizontal: 2,
    textAlign: "center",
    justifyContent: "center",
    borderColor: AppColors.black,
    borderWidth: 1,
    borderRadius: 20
  },
  daySelectedContainer: {
    backgroundColor: AppColors.black,
    borderColor: AppColors.yellow
  },
  textContainer: {
    color: AppColors.black,
    textAlign: "center"
  },
  textSelectedContainer: {
    color: AppColors.white
  }
});