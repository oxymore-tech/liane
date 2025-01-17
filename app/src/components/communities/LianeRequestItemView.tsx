import React, { useMemo, useState } from "react";

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
import { ModalLianeRequestItem } from "@/components/communities/ModalLianeRequestItemView.tsx";
import { AppButton } from "@/components/base/AppButton.tsx";

type LianeRequestItemProps = {
  item: CoLianeMatch;
  onRefresh: (() => void) | undefined;
  unreadLianes: Record<string, number>;
};

export const LianeRequestItem = ({ item, onRefresh, unreadLianes }: LianeRequestItemProps) => {
  const { navigation } = useAppNavigation();
  const [myModalVisible, setMyModalVisible] = useState<boolean>(false);
  const { to, from } = useMemo(() => extractWaypointFromTo(item.lianeRequest?.wayPoints), [item.lianeRequest.wayPoints]);
  const unread = useMemo(() => {
    return !!unreadLianes[item.lianeRequest.id!];
  }, [item.lianeRequest.id, unreadLianes]);

  return (
    <View>
      <Pressable
        style={{ justifyContent: "center", display: "flex" }}
        onPress={() =>
          item.state.type === "Attached"
            ? navigation.navigate("CommunitiesChat", { liane: item.state.liane })
            : navigation.navigate("MatchList", { matches: item.state.matches, lianeRequest: item.lianeRequest })
        }>
        <Row style={styles.driverContainer}>
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
                padding: 10
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
                  <AppButton
                    onPress={() => {
                      setMyModalVisible(true);
                    }}
                    icon="edit"
                    style={{
                      backgroundColor: item.state.type === "Attached" ? AppColors.white : AppColorPalettes.gray[200]
                    }}
                    textStyle={{
                      color: item.state.type === "Attached" ? AppColorPalettes.gray[700] : AppColorPalettes.gray[700]
                    }}
                  />
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
        </Row>
      </Pressable>
      <ModalLianeRequestItem item={item} onRefresh={onRefresh} myModalVisible={myModalVisible} setMyModalVisible={setMyModalVisible} />
    </View>
  );
};

const styles = StyleSheet.create({
  driverContainer: {
    alignItems: "center",
    marginTop: 10
  },
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
