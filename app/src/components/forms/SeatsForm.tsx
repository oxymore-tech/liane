import { Column, Row } from "@/components/base/AppLayout";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { AppButton } from "@/components/base/AppButton";
import { AppIcon } from "@/components/base/AppIcon";
import React from "react";

export interface SeatsFormProps {
  seats: number;

  setSeats: (n: number) => void;

  maxSeats?: number;
}
export const SeatsForm = ({ seats, setSeats, maxSeats = 8 }: SeatsFormProps) => {
  return (
    <Column
      spacing={8}
      style={{
        backgroundColor: AppColorPalettes.blue[100],
        borderRadius: 16,
        maxHeight: 110,
        alignItems: "center",
        padding: 16
      }}>
      {/*<AppText style={{ fontSize: 16 }}>{seats > 0 ? "Combien de places avez-vous ?" : "Combien de personnes voyagent ?"}</AppText>*/}
      <Row style={{ alignItems: "center" }} spacing={16}>
        <AppButton
          kind="circular"
          disabled={Math.abs(seats) === 1}
          color={AppColorPalettes.blue[400]}
          icon="minus-outline"
          onPress={() => {
            setSeats(Math.sign(seats) * Math.max(1, Math.abs(seats) - 1));
          }}
        />
        <Row
          spacing={4}
          style={{
            alignItems: "center",
            backgroundColor: WithAlpha(AppColors.black, 0.1),
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 24
          }}>
          <AppText style={{ fontSize: 24, minWidth: 20 }}>{Math.abs(seats)}</AppText>
          <AppIcon name="people-outline" size={24} />
        </Row>
        <AppButton
          disabled={Math.abs(seats) === maxSeats}
          kind="circular"
          color={AppColorPalettes.blue[500]}
          icon="plus-outline"
          onPress={() => {
            setSeats(Math.sign(seats) * Math.min(maxSeats, Math.abs(seats) + 1));
            //TODO set a maximum value
          }}
        />
      </Row>
    </Column>
  );
};
