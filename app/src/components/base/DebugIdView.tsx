import { Pressable, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import React from "react";
import { DEBUG_VIEWS } from "@env";
import { Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { Entity } from "@liane/common";

export const DebugIdView = ({ style, object, id }: { style?: any; object: Entity; id?: string }) => {
  if (__DEV__ && DEBUG_VIEWS) {
    id = id || object.id;
    return (
      <Row style={style} spacing={8}>
        {/* eslint-disable-next-line no-console */}
        <Pressable onPress={() => console.debug(id)}>
          <AppText>_id: {id}</AppText>
        </Pressable>
        {/* eslint-disable-next-line no-console */}
        <Pressable onPress={() => console.debug(JSON.stringify(object))}>
          <AppIcon name="send" size={18} />
        </Pressable>
      </Row>
    );
  } else {
    return <View />;
  }
};
