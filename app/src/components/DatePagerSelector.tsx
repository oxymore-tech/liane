import { isToday, withOffsetHours } from "@/util/datetime";
import { Row } from "@/components/base/AppLayout";
import { AppPressableIcon, AppPressableOverlay } from "@/components/base/AppPressable";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColorPalettes } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { formatShortMonthDay, toRelativeDateString } from "@/api/i18n";
import React, { useMemo, useRef, useState } from "react";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { WheelPicker } from "@/components/WheelPicker";
import { ColorValue, Platform } from "react-native";
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
    <Row style={{ alignItems: "center", justifyContent: "center" }} spacing={8}>
      <AppPressableIcon
        backgroundStyle={{ borderRadius: 8 }}
        clickable={!dateIsToday}
        onPress={
          dateIsToday
            ? undefined
            : () => {
                if (onSelectDate) {
                  const previousDay = withOffsetHours(-24, date);
                  const now = new Date();
                  onSelectDate(new Date((now > previousDay ? now : previousDay).toDateString()));
                }
              }
        }
        name={"chevron-left"}
        color={color}
        opacity={dateIsToday ? 0.4 : 1}
      />

      <AppPressableOverlay
        onPress={() => {
          setDatePickerVisible(true);
        }}
        style={{ alignItems: "center", justifyContent: "center", paddingVertical: 8, paddingHorizontal: 4 }}
        backgroundStyle={{ borderRadius: 8 }}>
        <Row spacing={6}>
          <AppIcon name={"calendar-outline"} size={18} color={color} />
          <AppText style={{ fontWeight: "bold", color }}>
            {formatter ? formatter(date || new Date()) : capitalize(toRelativeDateString(date, formatShortMonthDay))}
          </AppText>
        </Row>
      </AppPressableOverlay>

      <AppPressableIcon
        backgroundStyle={{ borderRadius: 8 }}
        onPress={() => {
          if (onSelectDate) {
            onSelectDate(new Date(withOffsetHours(24, date).toDateString()));
          }
        }}
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
          onSelectDate(new Date(d.toDateString()));
        }}
        onCancel={() => {
          setDatePickerVisible(false);
        }}
        onChange={() => {
          if (Platform.OS === "android") {
            setDatePickerVisible(false);
          }
        }}
      />
    </Row>
  );
};

export const TimeWheelPicker = ({
  date = new Date(),
  minuteStep = 1,
  onChange
}: {
  date?: Date;
  minuteStep?: 1 | 2 | 3 | 5 | 10 | 15 | 20 | 30;
  onChange: (d: Date) => void;
}) => {
  //  const hourRef = useRef();

  const [hours, minutes] = useMemo(() => {
    return [
      [...Array(24).keys()].map(k => k.toString().padStart(2, "0")),
      [...Array(60).keys()].filter(k => k % minuteStep === 0).map(k => k.toString().padStart(2, "0"))
    ];
  }, [minuteStep]);

  const [hour, setHour] = useState(date.getHours());
  const [minute, setMinute] = useState((Math.ceil(date.getMinutes() / minuteStep) * minuteStep) % 60);
  const prev = useRef(minute);

  const notifyChanged = (h: number, m: number) => {
    onChange(new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0));
  };

  return (
    <Row spacing={2} style={{ justifyContent: "center", alignItems: "center" }}>
      <WheelPicker
        selectedIndex={hour}
        isInfinite={true}
        itemTextStyle={{ fontWeight: "bold", fontSize: 16 }}
        selectedIndicatorStyle={{
          backgroundColor: "transparent",
          borderTopWidth: 1,
          borderRadius: 0,
          borderBottomWidth: 1,
          borderColor: AppColorPalettes.gray[800]
        }}
        options={hours}
        onChanged={index => {
          setHour(index);
          notifyChanged(index, minute);
        }}
        visibleRest={1}
      />

      <AppText>:</AppText>
      <WheelPicker
        selectedIndex={minute / minuteStep}
        isInfinite={true}
        itemTextStyle={{ fontWeight: "bold", fontSize: 16 }}
        selectedIndicatorStyle={{
          backgroundColor: "transparent",
          borderTopWidth: 1,
          borderRadius: 0,
          borderBottomWidth: 1,
          borderColor: AppColorPalettes.gray[800]
        }}
        options={minutes}
        onChanged={index => {
          setMinute(index * minuteStep);
          notifyChanged(hour, index * minuteStep);
        }}
        onChange={index => {
          const selectedMinute = index * minuteStep;
          if (prev.current === 0 && selectedMinute === 60 - minuteStep) {
            setHour(hour - 1);
          } else if (prev.current === 60 - minuteStep && selectedMinute === 0) {
            setHour(hour + 1);
          }
          prev.current = selectedMinute;
        }}
        visibleRest={1}
      />
    </Row>
  );
};
