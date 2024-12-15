import React from "react";
import { StyleSheet } from "react-native";

import { Column, Row } from "@/components/base/AppLayout";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";
import { AppIcon } from "@/components/base/AppIcon";
export interface SeatsFormProps {
  seats: number;

  setSeats: (n: number) => void;

  maxSeats?: number;
}
export const SeatsForm = ({ seats, setSeats, maxSeats = 8 }: SeatsFormProps) => {
  return (
    <Column spacing={8} style={styles.containerStyle}>
      <Row style={{ alignItems: "center" }} spacing={16}>
        <AppButton
          kind="rounded"
          disabled={Math.abs(seats) === 1}
          color={AppColorPalettes.gray[100]}
          foregroundColor={AppColors.primaryColor}
          icon="minus"
          onPress={() => {
            setSeats(Math.sign(seats) * Math.max(1, Math.abs(seats) - 1));
          }}
        />
        <Row style={styles.seatsStyle}>
          <AppText style={{ fontSize: 24, minWidth: 20, fontWeight: "bold" }}>{Math.abs(seats)}</AppText>
          <AppIcon name="people" size={24} />
        </Row>
        <AppButton
          disabled={Math.abs(seats) === maxSeats}
          kind="rounded"
          color={AppColorPalettes.gray[100]}
          foregroundColor={AppColors.primaryColor}
          icon="plus"
          onPress={() => {
            setSeats(Math.sign(seats) * Math.min(maxSeats, Math.abs(seats) + 1));
            //TODO set a maximum value
          }}
        />
      </Row>
    </Column>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    maxHeight: 110
  },
  seatsStyle: {
    alignItems: "center",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16
  }
});
