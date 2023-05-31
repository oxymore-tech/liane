import { Pressable, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import React from "react";
import { DEBUG_VIEWS } from "@env";

export const DebugIdView = ({ id, style }: { id: string; style?: any }) => {
  if (__DEV__ && DEBUG_VIEWS) {
    return (
      <Pressable style={style} onPress={() => console.debug(id)}>
        <AppText>_id: {id}</AppText>
      </Pressable>
    );
  } else {
    return <View />;
  }
};
