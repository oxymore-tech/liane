import { User } from "@/api";
import { AppColorPalettes } from "@/theme/colors";
import { AppIcon } from "@/components/base/AppIcon";
import React from "react";
import { Center } from "@/components/base/AppLayout";

export interface UserPictureProps {
  user: User;

  size?: number;
}

export const UserPicture = ({ size = 48 }: UserPictureProps) => {
  return (
    <Center
      style={{
        backgroundColor: AppColorPalettes.gray[200],
        borderRadius: 52,
        height: size,
        width: size
      }}>
      <AppIcon name={"person-outline"} size={28} />
    </Center>
  );
};
