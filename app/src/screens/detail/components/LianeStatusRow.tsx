import { LianeMatch } from "@liane/common";
import { Row } from "@/components/base/AppLayout";
import React from "react";
import { TripStatusView } from "@/components/trip/TripStatusView.tsx";

export const LianeStatusRow = ({ liane }: { liane: LianeMatch }) => {
  return (
    <Row style={{ marginHorizontal: 24, marginVertical: 4, alignItems: "center" }}>
      <TripStatusView liane={liane.trip} />
    </Row>
  );
};
