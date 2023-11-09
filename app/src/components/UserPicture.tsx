import React, { useMemo } from "react";
import { Image, StyleProp, ViewStyle } from "react-native";

import { AppIcon } from "@/components/base/AppIcon";
import { Center } from "@/components/base/AppLayout";

import { AppColorPalettes } from "@/theme/colors";
import { getUniqueColor } from "@liane/common";

export interface UserPictureProps {
  url: string | null | undefined;
  size?: number;
  id?: string;
  style?: StyleProp<ViewStyle>;
  borderWidth?: number;
  borderColor?: string;
}

export const UserPicture = ({ url, size = 48, id, style, borderWidth = 0, borderColor = "transparent" }: UserPictureProps) => {
  const color = useMemo(() => {
    if (id) {
      const hue = (getUniqueColor(id) + 360) % 360;
      return `hsl(${hue}, 30%, 78%)`;
    }
    return AppColorPalettes.gray[200];
  }, [id]);
  return (
    <Center
      style={[
        style,
        {
          borderWidth: borderWidth,
          borderColor: borderColor,
          backgroundColor: color,
          borderRadius: size,
          height: size,
          width: size
        }
      ]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={{
            borderWidth: borderWidth,
            borderColor: borderColor,
            borderRadius: size,
            height: size,
            width: size
          }}
        />
      ) : (
        <AppIcon
          name={"person-outline"}
          size={0.6 * size}
          style={{
            borderRadius: size,
            height: size,
            width: size
          }}
        />
      )}
    </Center>
  );
};
