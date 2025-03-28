import React, { useMemo } from "react";
import { Image, StyleProp, View, ViewStyle } from "react-native";

import { AppIcon } from "@/components/base/AppIcon";
import { Center, Row } from "@/components/base/AppLayout";

import { AppColorPalettes } from "@/theme/colors";
import { getUniqueColor, Ref, Trip, TripMember, User } from "@liane/common";
import { AppText } from "@/components/base/AppText.tsx";

export type AvatarsProps = {
  users: User[];
  size?: number;
  style?: StyleProp<ViewStyle>;
  borderWidth?: number;
  borderColor?: string;
  max?: number;
  driver?: Ref<User>;
};

export type TripMembersProps = {
  trip: Trip;
  size?: number;
  style?: StyleProp<ViewStyle>;
  borderWidth?: number;
  borderColor?: string;
  max?: number;
  driver?: Ref<User>;
  showStatus?: boolean;
};

export const TripMembers = ({ trip, size = 28, style, showStatus }: TripMembersProps) => {
  return (
    <Row style={[style, { marginLeft: 10 }]}>
      {trip.members.map(user => (
        <TripMemberView key={user.user.id} size={size} tripMember={user} driver={user.user.id === trip.driver.user} showStatus={showStatus} />
      ))}
    </Row>
  );
};

export const AppAvatars = ({ users, size = 28, style, max = 5, driver }: AvatarsProps) => {
  const rest = users.length - max;
  const filtered = rest === 1 ? users : users.filter((_, i) => i < max);
  return (
    <Row style={[style, { marginLeft: 10 }]}>
      {filtered.map(user => (
        <AppAvatar key={user.id} size={size} user={user} style={{ marginLeft: -5 }} driver={user.id === driver} />
      ))}
      {rest > 1 && (
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
  driver?: boolean;
}

export interface TripMemberViewProps {
  tripMember: TripMember;
  showStatus?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
  borderWidth?: number;
  borderColor?: string;
  shadow?: boolean;
  driver?: boolean;
}

export const TripMemberView = ({ tripMember, showStatus, ...props }: TripMemberViewProps) => {
  const backgroundColor = useMemo(() => {
    if (!showStatus) {
      return;
    }
    if (tripMember.arrival || tripMember.cancellation) {
      return AppColorPalettes.orange;
    }
    if (tripMember.departure) {
      return AppColorPalettes.green;
    }
    return;
  }, [showStatus, tripMember]);
  return (
    <View style={{ marginLeft: -5 }}>
      <AppAvatar user={tripMember.user} {...props} />
      {backgroundColor && (
        <View
          style={{
            position: "absolute",
            backgroundColor: backgroundColor[500],
            bottom: 0,
            borderRadius: 10,
            width: 10,
            height: 10,
            borderWidth: 1,
            borderColor: backgroundColor[700]
          }}
        />
      )}
    </View>
  );
};

export const AppAvatar = ({ user, size = 28, style, borderWidth = 0, borderColor = "transparent" }: AppAvatarProps) => {
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
        <AppText>
          {user.pseudo[0]}
          {user.pseudo[1]}
        </AppText>
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
          name="person"
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
