import React, { useMemo } from "react";

import { Pressable, StyleSheet, View } from "react-native";
import { CoLianeMatch } from "@liane/common";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { JoinedLianeView } from "@/components/communities/JoinedLianeView";
import { extractWaypointFromTo } from "@/util/hooks/lianeRequest";
import { DetachedLianeItem } from "@/components/communities/DetachedLianeItem.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import { AppIcon } from "@/components/base/AppIcon.tsx";

type LianeRequestItemProps = {
  item: CoLianeMatch;
  onRefresh: (() => void) | undefined;
  unreadLianes: Record<string, number>;
};

export const LianeRequestItem = ({ item, unreadLianes }: LianeRequestItemProps) => {
  const { navigation } = useAppNavigation();
  const { to, from } = useMemo(() => extractWaypointFromTo(item.lianeRequest?.wayPoints), [item.lianeRequest.wayPoints]);
  const unread = useMemo(() => {
    return !!unreadLianes[item.lianeRequest.id!];
  }, [item.lianeRequest.id, unreadLianes]);

  return (
    <Pressable
      style={{ justifyContent: "center", display: "flex" }}
      onPress={() =>
        item.state.type === "Attached"
          ? navigation.navigate("CommunitiesChat", { liane: item.state.liane.id! })
          : navigation.navigate("MatchList", { lianeRequest: item.lianeRequest.id! })
      }>
      <View style={styles.headerContainer}>
        <View
          style={{
            backgroundColor: item.state.type === "Attached" ? AppColors.backgroundColor : AppColorPalettes.gray[200],
            paddingLeft: 10,
            flexDirection: "row",
            justifyContent: "flex-start",
            alignItems: "center",
            flex: 1,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: AppColors.grayBackground,
            paddingHorizontal: 10,
            paddingVertical: 20,
            marginTop: 10
          }}>
          <View
            style={{
              padding: 8,
              borderRadius: 50,
              backgroundColor: AppColorPalettes.gray[400]
            }}>
            <AppIcon name="people" color={AppColors.white} size={32} />
            {unread && (
              <View style={styles.notificationDotContainer}>
                <View style={styles.notificationDot} />
              </View>
            )}
          </View>
          <View
            style={{
              paddingLeft: 10,
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1
            }}>
            <Row style={{ alignItems: "center", justifyContent: "space-between" }}>
              <AppText
                style={{
                  fontSize: 22,
                  fontWeight: "bold",
                  flexShrink: 1,
                  lineHeight: 27,
                  color: "black"
                }}>
                {item?.lianeRequest?.name}
              </AppText>
            </Row>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end"
              }}>
              <View>
                <AppText style={styles.cityFont}>{from.city}</AppText>
                <AppText style={styles.cityFont}>{to.city}</AppText>
              </View>
              <Row>
                {item.state.type === "Detached" && <DetachedLianeItem state={item.state} />}
                {item.state.type === "Attached" && <JoinedLianeView liane={item.state.liane} />}
              </Row>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  cityFont: {
    fontSize: 15,
    fontWeight: "normal",
    flexShrink: 1,
    lineHeight: 19,
    color: AppColors.darkGray
  },
  notificationDotContainer: {
    position: "absolute",
    right: 0
  },
  notificationDot: {
    width: 14,
    height: 14,
    borderRadius: 14,
    backgroundColor: AppColorPalettes.orange[500],
    borderColor: AppColors.white,
    borderWidth: 1
  }
});
