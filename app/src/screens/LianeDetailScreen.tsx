import { Liane } from "@/api";
import { ParamListBase } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { View } from "react-native";
import { LianeView } from "@/components/LianeView";

export interface LianeDetailScreenParams extends ParamListBase {
  liane?: Liane;
}

export const LianeDetailScreen = ({ route }: NativeStackScreenProps<LianeDetailScreenParams, "LianeDetail">) => {
  const liane = route.params!.liane;
  return (
    <View>
      <LianeView liane={liane} />
    </View>
  );
};
