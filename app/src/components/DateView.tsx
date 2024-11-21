import React, { useCallback, useState } from "react";
import { AppText } from "@/components/base/AppText";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import { AppLocalization } from "@/api/i18n.ts";
import { AppColors } from "@/theme/colors.ts";

export type DateViewProps = {
  onChange: (d: Date) => void;
  date?: Date;
  minDate?: Date;
  maxDate?: Date;
  style?: StyleProp<ViewStyle>;
  editable?: boolean;
};

export const DateView = ({ style, onChange, date = new Date(), minDate, maxDate, editable = false }: DateViewProps) => {
  const [edit, setEdit] = useState(false);

  const handlePress = useCallback(() => {
    setEdit(!edit);
  }, [edit]);

  const handleChange = useCallback(
    (_event: any, selectedDate: Date | undefined) => {
      setEdit(false);
      if (!selectedDate) {
        return;
      }
      onChange(selectedDate);
    },
    [onChange]
  );

  return (
    <Pressable
      style={[styles.container, editable && { backgroundColor: AppColors.lightGrayBackground }, style]}
      onPress={handlePress}
      disabled={!editable}>
      {editable && edit && <RNDateTimePicker mode="date" value={date} onChange={handleChange} minimumDate={minDate} maximumDate={maxDate} />}
      <AppText style={styles.hourStyle}>{AppLocalization.formatDateOnly(date)}</AppText>
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
