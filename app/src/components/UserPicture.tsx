import { AppColorPalettes } from "@/theme/colors";
import { AppIcon } from "@/components/base/AppIcon";
import React, { useMemo } from "react";
import { Center } from "@/components/base/AppLayout";
import { getUniqueColor } from "@/util/strings";

export interface UserPictureProps {
  url: string | null | undefined;
  size?: number;
  id?: string;
}

export const UserPicture = ({ size = 48, id }: UserPictureProps) => {
  const color = useMemo(() => {
    if (id) {
      const hue = (getUniqueColor(id) + 360) % 360;
      console.log(hue);
      return `hsl(${hue}, 30%, 78%)`;
    }
    return AppColorPalettes.gray[200];
  }, [id]);
  return (
    <Center
      style={{
        backgroundColor: color,
        borderRadius: size,
        height: size,
        width: size
      }}>
      <AppIcon name={"person-outline"} size={0.6 * size} />
    </Center>
  );
};
