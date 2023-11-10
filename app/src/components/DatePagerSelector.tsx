import React, { useMemo, useState } from "react";
import { ColorValue, Platform, StyleSheet } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { AppLocalization } from "@/api/i18n";
import { Center, Row } from "@/components/base/AppLayout";
import { AppPressableIcon, AppPressableOverlay } from "@/components/base/AppPressable";
import { AppText } from "@/components/base/AppText";

import { AppColors } from "@/theme/colors";

import { capitalize, isToday, withOffsetHours } from "@liane/common";

export const DatePagerSelector = ({
  date = new Date(),
  onSelectDate,
  formatter,
  color = AppColors.white,
  size = 22,
  borderBottomDisplayed = false
}: {
  date: Date | undefined;
  onSelectDate: (d: Date) => void;
  formatter?: (d: Date) => string;
  color?: ColorValue;
  size?: number;
  borderBottomDisplayed?: boolean;
}) => {
  const dateIsToday = !date || isToday(date);

  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [minDate, maxDate] = useMemo(() => {
    const now = new Date();
    return [now, new Date(new Date(now).setFullYear(now.getFullYear() + 1))];
  }, []);

  return (
    <Center>
      <Row spacing={8} style={borderBottomDisplayed ? styles.containerBorderStyle : {}}>
        <AppPressableIcon
          backgroundStyle={styles.buttonBorderRadius}
          clickable={!dateIsToday}
          onPress={() => (!dateIsToday ? previousDate(date, onSelectDate) : null)}
          name={"chevron-left"}
          color={color}
          size={size + 26}
          opacity={dateIsToday ? 0.4 : 1}
        />

        <Center>
          <AppPressableOverlay
            style={{ paddingVertical: 8, paddingHorizontal: 4 }}
            onPress={() => setDatePickerVisible(true)}
            backgroundStyle={styles.buttonBorderRadius}>
            <Row spacing={6}>
              <AppText style={{ fontWeight: "bold", color, fontSize: size }}>
                {formatter
                  ? formatter(date || new Date())
                  : capitalize(AppLocalization.toRelativeDateString(date, AppLocalization.formatShortMonthDay))}
              </AppText>
            </Row>
          </AppPressableOverlay>
        </Center>

        <AppPressableIcon
          backgroundStyle={styles.buttonBorderRadius}
          onPress={() => (onSelectDate ? onSelectDate(new Date(withOffsetHours(24, date))) : null)}
          name={"chevron-right"}
          color={color}
          size={size + 26}
        />

        <DateTimePickerModal
          accentColor={AppColors.primaryColor}
          isVisible={isDatePickerVisible}
          mode="date"
          minimumDate={minDate}
          maximumDate={maxDate}
          date={date || minDate}
          display={"inline"}
          confirmTextIOS={"Valider"}
          cancelTextIOS={"Annuler"}
          onConfirm={d => {
            setDatePickerVisible(false);
            onSelectDate(d);
          }}
          onCancel={() => setDatePickerVisible(false)}
          onChange={() => (Platform.OS === "android" ? setDatePickerVisible(false) : null)}
        />
      </Row>
    </Center>
  );
};

const previousDate = (date: Date, onSelectDate: (date: Date) => void) => {
  if (onSelectDate) {
    const previousDay = withOffsetHours(-24, date);
    const now = new Date();
    onSelectDate(new Date(now > previousDay ? now : previousDay));
  }
};

const styles = StyleSheet.create({
  containerBorderStyle: {
    borderBottomWidth: 1,
    borderBottomColor: AppColors.lightGrayBackground
  },
  buttonBorderRadius: {
    borderRadius: 8
  }
});
