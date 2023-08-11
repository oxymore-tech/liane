import { AppIcon, IconName } from "@/components/base/AppIcon";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import React from "react";

export const InfoItem = (props: { icon: IconName; value: string }) => {
  return (
    <Row spacing={12}>
      <AppIcon name={props.icon} size={22} />
      <AppText style={{ alignSelf: "center" }}>{props.value}</AppText>
    </Row>
  );
};
