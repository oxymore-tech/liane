import React, { useCallback, useMemo, useState } from "react";
import { AppText } from "@/components/base/AppText";
import { Pressable, StyleProp, StyleSheet, TextStyle, ViewStyle } from "react-native";
import { TimeOnly, TimeOnlyUtils, UTCDateTime } from "@liane/common";
import { AppLocalization } from "@/api/i18n.ts";
import { AppColors } from "@/theme/colors.ts";
import DateTimePickerModal from "react-native-modal-datetime-picker";

const minuteStep = 5;

export type GenericTimeValue = TimeOnly | UTCDateTime | Date;

export type TimeViewProps<T extends GenericTimeValue> = {
  onChange?: (d: T) => void;
  value?: T;
  minDate?: GenericTimeValue;
  maxDate?: GenericTimeValue;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  editable?: boolean;
};

function convertToTimeOnly(value: GenericTimeValue | undefined): TimeOnly | undefined {
  if (value instanceof Date) {
    return { hour: value.getHours(), minute: value.getMinutes() } as TimeOnly;
  }
  if (typeof value === "string") {
    return TimeOnlyUtils.fromDate(new Date(value));
  }
  return value;
}

export function TimeView<T extends GenericTimeValue>({ value, minDate, maxDate, onChange, ...props }: TimeViewProps<T>) {
  const onChangeGeneric = useCallback(
    (d: TimeOnly) => {
      if (!onChange) {
        return;
      }

      if (value instanceof Date) {
        const date = new Date(value);
        date.setHours(d.hour);
        date.setMinutes(d.minute ?? 0);
        onChange(date as T);
        return;
      }

      if (typeof value === "string") {
        const date = new Date(value);
        date.setHours(d.hour);
        date.setMinutes(d.minute ?? 0);
        onChange(date.toISOString() as T);
        return;
      }

      onChange(d as T);
    },
    [onChange, value]
  );
  return (
    <InternalTimeView
      {...props}
      editable={props.editable && !!onChange}
      onChange={onChangeGeneric}
      value={convertToTimeOnly(value)}
      minDate={convertToTimeOnly(minDate)}
      maxDate={convertToTimeOnly(maxDate)}
    />
  );
}

type GenericTimeViewProps = {
  onChange: (d: TimeOnly) => void;
  value?: TimeOnly;
  minDate?: TimeOnly;
  maxDate?: TimeOnly;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  editable?: boolean;
};

export const InternalTimeView = ({ style, textStyle, onChange, value, minDate, maxDate, editable = false }: GenericTimeViewProps) => {
  const dateValue = useMemo(() => TimeOnlyUtils.trim(value ?? TimeOnlyUtils.now(minuteStep), minDate, maxDate), [value, maxDate, minDate]);
  const [edit, setEdit] = useState(false);

  const handlePress = useCallback(() => {
    setEdit(!edit);
  }, [edit]);

  const handleTimeChange = useCallback(
    (selectedDate: Date | undefined) => {
      setEdit(false);
      const hour = selectedDate?.getHours();
      const minute = selectedDate?.getMinutes();
      onChange({ hour, minute } as TimeOnly);
    },
    [onChange]
  );

  return (
    <Pressable
      style={[styles.container, editable && { backgroundColor: AppColors.lightGrayBackground }, style]}
      onPress={handlePress}
      disabled={!editable}>
      {editable && (
        <DateTimePickerModal
          mode="time"
          date={TimeOnlyUtils.toDate(dateValue)}
          onConfirm={handleTimeChange}
          minuteInterval={5}
          isVisible={edit}
          onCancel={handlePress}
        />
      )}
      <AppText style={[textStyle, styles.hourStyle]}>{AppLocalization.formatTimeOnly(dateValue)}</AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 12
  },
  hourStyle: {
    fontWeight: "bold",
    fontSize: 16
  }
});
