import React, { useEffect, useMemo, useRef, useState } from "react";
import { Center, Row } from "@/components/base/AppLayout";
import { WheelPicker } from "@/components/WheelPicker";
import { AppText } from "@/components/base/AppText";
import { StyleSheet } from "react-native";
import { AppColorPalettes } from "@/theme/colors";

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
  minDate?: Date | undefined;
  maxDate?: Date | undefined;
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

  const onChangeHours = (index: number) => {
    setHour(index);
    notifyChanged(index, minute);
  };

  const onChangeMinutes = (index: number) => {
    setMinute(index * minuteStep);
    notifyChanged(hour, index * minuteStep);
  };

  const onPassNewHour = (index: number) => {
    const selectedMinute = index * minuteStep;
    if (prev.current === 0 && selectedMinute === 60 - minuteStep) {
      setHour(hour - 1);
    } else if (prev.current === 60 - minuteStep && selectedMinute === 0) {
      setHour(hour + 1);
    }
    prev.current = selectedMinute;
  };
  return (
    <Center>
      <Row spacing={2} style={styles.alignCenter}>
        <WheelPicker
          selectedIndex={hour}
          isInfinite={true}
          itemTextStyle={styles.itemTextStyle}
          selectedIndicatorStyle={styles.selectedIndicator}
          options={hours}
          onChanged={index => onChangeHours(index)}
          visibleRest={1}
        />

        <AppText>:</AppText>

        <WheelPicker
          selectedIndex={minute / minuteStep}
          isInfinite={true}
          itemTextStyle={styles.itemTextStyle}
          selectedIndicatorStyle={styles.selectedIndicator}
          options={minutes}
          onChanged={index => onChangeMinutes(index)}
          onChange={index => onPassNewHour(index)}
          visibleRest={1}
        />
      </Row>
    </Center>
  );
};

const styles = StyleSheet.create({
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
