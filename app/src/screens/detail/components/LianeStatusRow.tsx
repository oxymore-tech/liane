import { LianeMatch } from "@/api";
import { Row } from "@/components/base/AppLayout";
import React from "react";
import { LianeStatusView } from "@/components/trip/LianeStatusView";

export const LianeStatusRow = ({ liane }: { liane: LianeMatch }) => {
  return (
    <Row style={{ marginHorizontal: 24, marginVertical: 4, alignItems: "center" }}>
      <LianeStatusView liane={liane.liane} />
    </Row>
  );
};
