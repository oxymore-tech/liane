import { LianeMatch } from "@/api";
import { getLianeStatusStyle } from "@/components/trip/trip";
import { View } from "react-native";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import React from "react";

export const LianeStatusRow = ({ liane }: { liane: LianeMatch }) => {
  const [status, color] = getLianeStatusStyle(liane.liane);
  return (
    <View>
      {!!status && (
        <Row style={{ marginHorizontal: 24, marginVertical: 4 }}>
          <View style={{ borderRadius: 4, padding: 4, backgroundColor: color }}>
            <AppText>{status}</AppText>
          </View>
        </Row>
      )}
    </View>
  );
};
