import React, { useEffect, useMemo, useRef, useState } from "react";
import { ColorValue, Platform, StyleSheet } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

import { formatShortMonthDay, toRelativeDateString } from "@/api/i18n";

import { Center, Row } from "@/components/base/AppLayout";
import { AppPressableIcon, AppPressableOverlay } from "@/components/base/AppPressable";
import { AppIcon } from "@/components/base/AppIcon";
import { AppText } from "@/components/base/AppText";
import { WheelPicker } from "@/components/WheelPicker";

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

export const TimeWheelPicker = ({
  onChange,
  date = new Date(),
  minuteStep = 1,
  minDate,
  maxDate
}: {
  onChange: (d: Date) => void;
  date?: Date;
  minuteStep?: 1 | 2 | 3 | 5 | 10 | 15 | 20 | 30;
  minDate?: Date;
  maxDate?: Date;
}) => {
  const [hours, minutes] = useMemo(() => {
    return [
      [...Array(24).keys()].map(k => k.toString().padStart(2, "0")),
      [...Array(60).keys()].filter(k => k % minuteStep === 0).map(k => k.toString().padStart(2, "0"))
    ];
  }, [minuteStep]);

  const [hour, setHour] = useState(date.getHours());
  const [minute, setMinute] = useState((Math.ceil(date.getMinutes() / minuteStep) * minuteStep) % 60);
  const prev = useRef(minute);

  // Update the date based on min and max date
  // If date is modified, return true
  // If not, return false
  const updateDateTime = (date: Date): boolean => {
    let newDate = date;
    if (minDate && minDate.getTime() > newDate.getTime()) {
      // Replace new date by minDate if under minimum date
      newDate = new Date(minDate.setMinutes(minDate.getMinutes() + minuteStep - (minDate.getMinutes() % minuteStep)));
      setTimeout(() => {
        setHour(newDate.getHours());
        setMinute(newDate.getMinutes());
      }, 50);

      onChange(new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), newDate.getHours(), newDate.getMinutes(), 0));
      return true;
    } else if (maxDate && maxDate.getTime() < newDate.getTime()) {
      // Replace new date by maxDate if over maximum date
      newDate = new Date(maxDate.setMinutes(maxDate.getMinutes() + minuteStep - (maxDate.getMinutes() % minuteStep)));
      setTimeout(() => {
        setHour(newDate.getHours());
        setMinute(newDate.getMinutes());
      }, 50);

      onChange(new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), newDate.getHours(), newDate.getMinutes(), 0));
      return true;
    }
    return false;
  };

  // Send new date to parent
  // Update date time if necessary based on min and max
  // If not updated, call onChange with the new date
  const notifyChanged = (h: number, m: number) => {
    let newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0);
    if (!updateDateTime(newDate)) {
      onChange(newDate);
    }
  };

  // When date is modified, update date time if necessary based on min and max
  useEffect(() => {
    let newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), 0);
    updateDateTime(newDate);
  }, [date, minDate, maxDate]);

  return (
    <Center>
      <Row spacing={2}>
        <WheelPicker
          selectedIndex={hour}
          isInfinite={true}
          itemTextStyle={styles.itemTextStyle}
          selectedIndicatorStyle={styles.selectedIndicator}
          options={hours}
          onChanged={index => onChangeHours(index, minute, setHour, notifyChanged)}
          visibleRest={1}
        />

        <AppText>:</AppText>

        <WheelPicker
          selectedIndex={minute / minuteStep}
          isInfinite={true}
          itemTextStyle={styles.itemTextStyle}
          selectedIndicatorStyle={styles.selectedIndicator}
          options={minutes}
          onChanged={index => onChangeMinutes(index, hour, minuteStep, setMinute, notifyChanged)}
          onChange={index => onPassNewHour(index, hour, prev, minuteStep, setHour)}
          visibleRest={1}
        />
      </Row>
    </Center>
  );
};

const onChangeHours = (index: number, minute: number, setHour: (hour: number) => void, notifyChanged: (h: number, m: number) => void) => {
  setHour(index);
  notifyChanged(index, minute);
};

const onChangeMinutes = (
  index: number,
  hour: number,
  minuteStep: number,
  setMinute: (minute: number) => void,
  notifyChanged: (h: number, m: number) => void
) => {
  setMinute(index * minuteStep);
  notifyChanged(hour, index * minuteStep);
};

const onPassNewHour = (index: number, hour: number, prev: React.MutableRefObject<number>, minuteStep: number, setHour: (hour: number) => void) => {
  const selectedMinute = index * minuteStep;
  if (prev.current === 0 && selectedMinute === 60 - minuteStep) {
    setHour(hour - 1);
  } else if (prev.current === 60 - minuteStep && selectedMinute === 0) {
    setHour(hour + 1);
  }
  prev.current = selectedMinute;
};

const styles = StyleSheet.create({
  buttonBorderRadius: {
    borderRadius: 8
  },
  itemTextStyle: {
    fontWeight: "bold",
    fontSize: 16
  },
  selectedIndicator: {
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderColor: AppColorPalettes.gray[800]
  }
});
