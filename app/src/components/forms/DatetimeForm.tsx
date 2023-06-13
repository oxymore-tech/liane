import { Platform, StyleSheet } from "react-native";
import { Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import React, { useEffect, useState } from "react";
import { AppColors, defaultTextColor } from "@/theme/colors";
import { AppPressableOverlay } from "@/components/base/AppPressable";
import { AppText } from "@/components/base/AppText";
import { formatMonthDay, formatTime } from "@/api/i18n";
import { BaseFormComponentProps, WithFormController } from "@/components/forms/WithFormController";
import DateTimePickerModal from "react-native-modal-datetime-picker";

export type DatetimeFormMode = "time" | "date";

export interface DatetimeFormProps {
  backgroundStyle: any;

  mode: DatetimeFormMode;
}

//TODO picker as dialog for departuretime change
export const DateTimePicker = ({ value, onChange, mode }: BaseFormComponentProps<Date | undefined> & DatetimeFormProps) => {
  const isIOS = Platform.OS === "ios";
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  useEffect(() => {
    if (!value) {
      onChange(new Date());
    }
  });
  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (v: Date) => {
    hideDatePicker();
    onChange(v);
  };

  return (
    <DateTimePickerModal
      isVisible={isDatePickerVisible}
      mode={mode}
      date={value}
      display={isIOS && mode === "date" ? "spinner" : undefined}
      onConfirm={handleConfirm}
      onCancel={hideDatePicker}
      cancelTextIOS={"Annuler"}
      confirmTextIOS={"Valider"}
    />
  );
};
export const DatetimeForm = WithFormController(
  ({ value, onChange, backgroundStyle, mode }: BaseFormComponentProps<Date | undefined> & DatetimeFormProps) => {
    const isIOS = Platform.OS === "ios";
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

    useEffect(() => {
      if (!value) {
        onChange(new Date());
      }
    });

    const formatter = mode === "date" ? formatMonthDay : formatTime;

    const showDatePicker = () => {
      setDatePickerVisibility(true);
    };

    const hideDatePicker = () => {
      setDatePickerVisibility(false);
    };

    const handleConfirm = (v: Date) => {
      hideDatePicker();
      onChange(v);
    };

    return (
      <AppPressableOverlay onPress={showDatePicker} backgroundStyle={backgroundStyle}>
        <Row
          spacing={16}
          style={{
            padding: 12
          }}>
          <AppIcon name={"calendar-outline"} />
          <AppText style={[{ textAlign: "center", color: defaultTextColor(AppColors.yellow) }, styles.value]}>{formatter(value)}</AppText>
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode={mode}
            date={value}
            display={isIOS && mode === "date" ? "inline" : undefined}
            onConfirm={handleConfirm}
            onCancel={hideDatePicker}
            cancelTextIOS={"Annuler"}
            confirmTextIOS={"Valider"}
          />
        </Row>
      </AppPressableOverlay>
    );
  }
);

const styles = StyleSheet.create({
  value: {
    fontSize: 18,
    fontWeight: "600"
  }
});
