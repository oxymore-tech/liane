import React, { useMemo, useState } from "react";

import { Pressable, StyleSheet, View } from "react-native";
import { CoLianeMatch } from "@liane/common";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColors } from "@/theme/colors";
import { JoinedLianeView } from "@/components/communities/JoinedLianeView";
import { extractDaysOnly, extractWaypointFromTo } from "@/util/hooks/lianeRequest";
import { DetachedLianeItem } from "@/components/communities/DetachedLianeItem.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { ModalLianeRequestItem } from "@/components/communities/ModalLianeRequestItemView.tsx";

type LianeRequestItemProps = {
  item: CoLianeMatch;
  onRefresh: (() => void) | undefined;
  unreadLianes: Record<string, number>;
};

export const LianeRequestItem = ({ item, onRefresh, unreadLianes }: LianeRequestItemProps) => {
  const { navigation } = useAppNavigation();
  const [myModalVisible, setMyModalVisible] = useState<boolean>(false);
  const { to, from } = useMemo(() => extractWaypointFromTo(item.lianeRequest?.wayPoints), [item.lianeRequest.wayPoints]);

  return (
    <View>
      <Pressable
        style={{ justifyContent: "center", display: "flex", marginRight: 20 }}
        onPress={() => item.state.type === "Attached" && navigation.navigate("CommunitiesChat", { liane: item.state.liane })}>
        <View>
          <Row style={styles.driverContainer}>
            <Row>
              <View style={styles.headerContainer}>
                <View
                  style={{
                    backgroundColor: AppColors.backgroundColor,
                    paddingLeft: 10,
                    flex: 1,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: AppColors.grayBackground
                  }}>
                  <View style={{ padding: 10 }}>
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
                    <AppText
                      style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        flexShrink: 1,
                        lineHeight: 27,
                        color: "black"
                      }}>
                      {`${from.city}`}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 20,
                        fontWeight: "bold",
                        flexShrink: 1,
                        lineHeight: 27,
                        color: "black"
                      }}>
                      {`${to.city}`}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 15,
                        fontWeight: "bold",
                        flexShrink: 1,
                        lineHeight: 20,
                        color: AppColors.darkGray
                      }}>
                      {extractDaysOnly(item.lianeRequest)}
                    </AppText>
                    <Pressable
                      style={{ position: "absolute", top: 10, right: 10 }}
                      onPress={event => {
                        setMyModalVisible(true);
                      }}>
                      <AppIcon name={"edit-2-outline"} color={AppColors.darkGray} size={22} />
                    </Pressable>
                    <View style={styles.subRowsContainer}>
                      {item.state.type === "Detached" && <DetachedLianeItem lianeRequest={item.lianeRequest} state={item.state} />}

                      {item.state.type === "Pending" && (
                        <Row style={styles.subRow}>
                          <AppText style={{ fontSize: 14, fontWeight: "bold", lineHeight: 23, color: AppColors.black }}>
                            en attente de validation
                          </AppText>
                        </Row>
                      )}

                      {item.state.type === "Attached" && (
                        <Row style={styles.subRow}>
                          <JoinedLianeView liane={item.state.liane} />
                        </Row>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </Row>
          </Row>
        </View>
      </Pressable>
      <ModalLianeRequestItem item={item} onRefresh={onRefresh} myModalVisible={myModalVisible} setMyModalVisible={setMyModalVisible} />
    </View>
  );
};

const styles = StyleSheet.create({
  driverContainer: {
    alignItems: "center"
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  subRowsContainer: {
    marginLeft: 28,
    marginRight: 10,
    alignItems: "flex-end",
    backgroundColor: AppColors.backgroundColor,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    display: "flex"
  },
  subRow: {
    flex: 1,
    alignItems: "flex-end",
    padding: 15
  }
});
