import React, { useMemo } from "react";
import { Center, Row } from "@/components/base/AppLayout";
import { WheelPicker } from "@/components/WheelPicker";
import { AppText } from "@/components/base/AppText";
import { StyleSheet } from "react-native";
import { AppColorPalettes } from "@/theme/colors";
import { TimeOnly, TimeOnlyUtils } from "@liane/common";

export const TimeWheelPicker = ({
  onChange,
  date,
  minuteStep = 1,
  minDate,
  maxDate
}: {
  onChange: (d: TimeOnly) => void;
  date?: TimeOnly;
  minuteStep?: 1 | 2 | 3 | 5 | 10 | 15 | 20 | 30;
  minDate?: TimeOnly | undefined;
  maxDate?: TimeOnly | undefined;
}) => {
  const [hours, minutes] = useMemo(() => {
    return [
      [...Array(24).keys()].map(k => k.toString().padStart(2, "0")),
      [...Array(60).keys()].filter(k => k % minuteStep === 0).map(k => k.toString().padStart(2, "0"))
    ];
  }, [minuteStep]);

  const dateValue = TimeOnlyUtils.trim(date ?? TimeOnlyUtils.now(minuteStep), minDate, maxDate);

  // Send new date to parent
  // Update date time if necessary based on min and max
  // If not updated, call onChange with the new date
  const notifyChanged = (hour: number, minute?: number) => {
    onChange({ hour, minute } as TimeOnly);
  };

  const onChangeHours = (index: number) => {
    notifyChanged(index, dateValue.minute);
  };

  const onChangeMinutes = (index: number) => {
    notifyChanged(dateValue.hour, index * minuteStep);
  };

  return (
    <Center>
      <Row spacing={2} style={styles.alignCenter}>
        <WheelPicker
          selectedIndex={dateValue.hour}
          isInfinite={true}
          itemTextStyle={styles.itemTextStyle}
          selectedIndicatorStyle={styles.selectedIndicator}
          options={hours}
          onChanged={index => onChangeHours(index)}
          visibleRest={1}
        />

        <AppText style={styles.hourStyle}>:</AppText>

        <WheelPicker
          selectedIndex={dateValue.minute ?? 0 / minuteStep}
          isInfinite={true}
          itemTextStyle={styles.itemTextStyle}
          selectedIndicatorStyle={styles.selectedIndicator}
          options={minutes}
          onChanged={index => onChangeMinutes(index)}
          visibleRest={1}
        />
      </Row>
    </Center>
  );
};

const styles = StyleSheet.create({
  hourStyle: {
    fontWeight: "bold",
    fontSize: 16
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
  },
  alignCenter: {
    alignItems: "center"
  }
});
