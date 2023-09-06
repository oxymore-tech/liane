import React, { useMemo, useState } from "react";
import { ColorValue, Platform, StyleSheet } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { formatShortMonthDay, toRelativeDateString } from "@/api/i18n";
import { Center, Row } from "@/components/base/AppLayout";
import { AppPressableIcon, AppPressableOverlay } from "@/components/base/AppPressable";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes } from "@/theme/colors";
import { isToday, withOffsetHours } from "@/util/datetime";
import { capitalize } from "@/util/strings";

export const DatePagerSelector = ({
  date = new Date(),
  onSelectDate,
  formatter,
  color = AppColorPalettes.gray[800]
}: {
  date: Date | undefined;
  onSelectDate: (d: Date) => void;
  formatter?: (d: Date) => string;
  color?: ColorValue;
}) => {
  const dateIsToday = !date || isToday(date);

  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [minDate, maxDate] = useMemo(() => {
    const now = new Date();
    return [now, new Date(new Date(now).setFullYear(now.getFullYear() + 1))];
  }, []);

  return (
    <Center>
      <Row spacing={8}>
        <AppPressableIcon
          backgroundStyle={styles.buttonBorderRadius}
          clickable={!dateIsToday}
          onPress={() => (!dateIsToday ? previousDate(date, onSelectDate) : null)}
          name={"chevron-left"}
          color={color}
          opacity={dateIsToday ? 0.4 : 1}
        />

        <Center>
          <AppPressableOverlay
            style={{ paddingVertical: 8, paddingHorizontal: 4 }}
            onPress={() => setDatePickerVisible(true)}
            backgroundStyle={styles.buttonBorderRadius}>
            <Row spacing={6}>
              <AppIcon name={"calendar-outline"} size={18} color={color} />
              <AppText style={{ fontWeight: "bold", color }}>
                {formatter ? formatter(date || new Date()) : capitalize(toRelativeDateString(date, formatShortMonthDay))}
              </AppText>
            </Row>
          </AppPressableOverlay>
        </Center>

        <AppPressableIcon
          backgroundStyle={styles.buttonBorderRadius}
          onPress={() => (onSelectDate ? onSelectDate(new Date(withOffsetHours(24, date))) : null)}
          name={"chevron-right"}
          color={color}
        />

        <DateTimePickerModal
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
  buttonBorderRadius: {
    borderRadius: 8
  }
});
