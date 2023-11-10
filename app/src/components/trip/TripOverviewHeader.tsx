import { Column, Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppIcon } from "@/components/base/AppIcon";
import { AppColors } from "@/theme/colors";
import React from "react";
import { RallyingPoint, UTCDateTime } from "@liane/common";
import { ColorValue, StyleSheet } from "react-native";
import { AppLocalization } from "@/api/i18n";

export interface TripOverviewHeaderProps {
  from: RallyingPoint;
  to: RallyingPoint;

  dateTime: UTCDateTime;

  color?: ColorValue;
}

export const TripOverviewHeader = ({ from, to, dateTime, color }: TripOverviewHeaderProps) => {
  const textColor = color || AppColors.white;
  return (
    <Column style={{ flexShrink: 1, flexGrow: 1 }}>
      <Row style={{ alignItems: "center" }} spacing={4}>
        <AppText style={[styles.headerText, { color: textColor }]}>{from.city}</AppText>
        <AppIcon name={"arrow-forward-outline"} color={textColor} size={14} />
        <AppText style={[styles.headerText, { color: textColor }]}>{to.city}</AppText>
      </Row>
      <AppText style={[styles.headerText, { color: textColor, fontSize: 14 }]}>{AppLocalization.formatDateTime(new Date(dateTime))}</AppText>
    </Column>
  );
};

const styles = StyleSheet.create({
  headerText: {
    fontSize: 16,
    textAlignVertical: "center"
  }
});
