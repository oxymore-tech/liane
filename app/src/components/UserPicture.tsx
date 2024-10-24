import React, { useMemo } from "react";
import { Image, StyleProp, ViewStyle } from "react-native";

import { AppIcon } from "@/components/base/AppIcon";
import { Center, Row } from "@/components/base/AppLayout";

import { AppColorPalettes } from "@/theme/colors";
import { getUniqueColor, User } from "@liane/common";
import { AppText } from "@/components/base/AppText.tsx";

export type AvatarsProps = {
  users: User[];
  size?: number;
  style?: StyleProp<ViewStyle>;
  borderWidth?: number;
  borderColor?: string;
  max?: number;
};

export const AppAvatars = ({ users, size = 48, style, max = 5 }: AvatarsProps) => {
  const rest = users.length - max;
  return (
    <Row style={style}>
      {users
        .filter((_, i) => i < 5)
        .map(user => (
          <UserPicture key={user.id} size={size} url={user.pictureUrl} id={user.id} style={{ marginLeft: -10 }} />
        ))}
      {rest > 0 && (
        <Center
          style={{
            backgroundColor: AppColorPalettes.gray[200],
            borderRadius: size,
            height: size,
            width: size,
            marginLeft: -10
          }}>
          <AppText>+{rest}</AppText>
        </Center>
      )}
    </Row>
  );
};

export interface AppAvatarProps {
  user: User;
  size?: number;
  style?: StyleProp<ViewStyle>;
  borderWidth?: number;
  borderColor?: string;
  shadow?: boolean;
}

export const AppAvatar = ({ user, size = 48, style, borderWidth = 0, borderColor = "transparent" }: AppAvatarProps) => {
  const color = useMemo(() => {
    if (user.id) {
      const hue = (getUniqueColor(user.id) + 360) % 360;
      return `hsl(${hue}, 30%, 78%)`;
    }
    return AppColorPalettes.gray[200];
  }, [user.id]);
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
      {user.pictureUrl ? (
        <Image
          source={{ uri: user.pictureUrl }}
          style={{
            borderWidth: borderWidth,
            borderColor: borderColor,
            borderRadius: size,
            height: size,
            width: size
          }}
        />
      ) : (
        <AppText>{user.pseudo[0]}</AppText>
      )}
    </Center>
  );
};

export interface UserPictureProps {
  url: string | null | undefined;
  size?: number;
  id?: string;
  style?: StyleProp<ViewStyle>;
  borderWidth?: number;
  borderColor?: string;
  shadow?: boolean;
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
