import { Column, Row } from "@/components/base/AppLayout.tsx";
import { AppText } from "@/components/base/AppText.tsx";
import { AppLocalization } from "@/api/i18n.ts";
import { useMemo } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors.ts";
import { AppPressable } from "@/components/base/AppPressable.tsx";
import { DayOfWeek, IncomingTrip } from "@liane/common";

type WeekHeaderProps = {
  selectedDay: Date;
  style?: StyleProp<ViewStyle>;
  onSelect: (date: Date) => void;
  incomingTrips?: Record<DayOfWeek, IncomingTrip[]>;
};

export function WeekHeader({ selectedDay, style, onSelect, incomingTrips }: WeekHeaderProps) {
  const days = useMemo(() => {
    const now = new Date();
    const daysArray = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(now);
      day.setDate(now.getDate() + i);
      daysArray.push(day);
    }
    return daysArray;
  }, []);
  return (
    <Column style={[{ backgroundColor: AppColors.white }, style]}>
      <AppText style={styles.month}>{AppLocalization.formatMonth(selectedDay)}</AppText>
      <Row style={{ width: "100%", justifyContent: "space-between", marginVertical: 16 }}>
        {days.map((day, index) => (
          <Day
            key={index}
            date={day}
            selected={selectedDay.getDate() === day.getDate()}
            onSelect={onSelect}
            incomingTrips={incomingTrips ? incomingTrips[day.getDay() as DayOfWeek] : undefined}
          />
        ))}
      </Row>
    </Column>
  );
}

type DayProps = {
  date: Date;
  selected?: boolean;
  onSelect: (date: Date) => void;
  incomingTrips?: IncomingTrip[];
};

function Day({ date, selected, onSelect, incomingTrips }: DayProps) {
  const hasLiane = useMemo(() => (incomingTrips?.length ?? 0) > 0, [incomingTrips]);
  const booked = useMemo(() => {
    if (!incomingTrips) {
      return false;
    }
    return incomingTrips.some(trip => trip.booked);
  }, [incomingTrips]);
  return (
    <AppPressable style={{ flexDirection: "column", alignItems: "center" }} onPress={() => onSelect(date)}>
      <AppText style={styles.weekday}>{AppLocalization.formatDay(date).substring(0, 3)}</AppText>
      <AppText style={[styles.day, selected && { backgroundColor: AppColorPalettes.pink[500], color: AppColors.white }]}>{date.getDate()}</AppText>
      {hasLiane && (
        <View
          style={[styles.dot, { backgroundColor: selected ? AppColors.white : booked ? AppColorPalettes.pink[500] : AppColorPalettes.gray[800] }]}
        />
      )}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  month: {
    color: AppColorPalettes.gray[800],
    textTransform: "capitalize",
    fontSize: 18,
    fontWeight: "bold"
  },
  weekday: {
    color: AppColorPalettes.gray[300],
    textTransform: "uppercase",
    fontSize: 14
  },
  day: {
    color: AppColorPalettes.gray[800],
    fontSize: 18,
    borderRadius: 20,
    width: 40,
    height: 40,
    textAlign: "center"
  },
  dot: {
    position: "absolute",
    bottom: 0,
    width: 5,
    height: 5,
    borderRadius: 5
  }
});
