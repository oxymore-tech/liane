import React from "react";

import { AppIcon, IconName } from "@/components/base/AppIcon";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";

import { AppColorPalettes } from "@/theme/colors";
import { AppStyles } from "@/theme/styles";

export const InfoItem = (props: { icon: IconName; value: string }) => {
  return (
    <Row style={AppStyles.center} spacing={12}>
      <AppIcon name={props.icon} size={12} color={AppColorPalettes.gray[500]} />
      <AppText style={{ alignSelf: "center", color: AppColorPalettes.gray[500] }}>{props.value}</AppText>
    </Row>
  );
};
