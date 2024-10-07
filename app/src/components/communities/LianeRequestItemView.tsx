import React, { useContext, useMemo } from "react";

import { Pressable, StyleSheet, View } from "react-native";
import { CoLianeMatch } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColors } from "@/theme/colors";
import { JoinedLianeView } from "@/components/communities/JoinedLianeView";
import { AppLogger } from "@/api/logger";
import { extractDaysOnly, extractWaypointFromTo } from "@/util/hooks/lianeRequest";
import { DetachedLianeItem } from "@/components/communities/DetachedLianeItem.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";

type LianeRequestItemProps = {
  item: CoLianeMatch;
  onRefresh: (() => void) | undefined;
  unreadLianes: Record<string, number>;
};

export const LianeRequestItem = ({ item, onRefresh, unreadLianes }: LianeRequestItemProps) => {
  const { services } = useContext(AppContext);
  const { navigation } = useAppNavigation();

  const { to, from } = useMemo(() => extractWaypointFromTo(item.lianeRequest?.wayPoints), [item.lianeRequest.wayPoints]);

  const deleteLiane = async () => {
    const lianeRequest = item.lianeRequest;

    if (lianeRequest && lianeRequest.id) {
      try {
        const result = await services.community.delete(lianeRequest.id);
        AppLogger.debug("COMMUNITIES", "Suppression d'une liane avec succès", result);
        if (onRefresh) {
          onRefresh();
        }
      } catch (error) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de la suppression d'une liane", error);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de liane ID lors de la suppression d'une liane", item);
    }
  };

  /*  const switchLianeRequestStatus = async () => {
    const lianeRequest = item.lianeRequest;

    if (lianeRequest && lianeRequest.id) {
      lianeRequest.isEnabled = !lianeRequest.isEnabled;

      try {
        const updatedLianeRequest = await services.community.update(lianeRequest.id, lianeRequest);
        if (onRefresh) {
          onRefresh();
        }
        AppLogger.debug("COMMUNITIES", "Changement du status d'une liane fait avec succès", updatedLianeRequest);
      } catch (error) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors du changement du status d'une liane", error);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de lianeRequest lors du changement du status d'une liane", lianeRequest);
    }
  };*/

  return (
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
                      fontWeight: "500",
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
                    {`${from.label}`}
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 20,
                      fontWeight: "bold",
                      flexShrink: 1,
                      lineHeight: 27,
                      color: "black"
                    }}>
                    {`${to.label}`}
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 15,
                      fontWeight: "500",
                      flexShrink: 1,
                      lineHeight: 20,
                      color: AppColors.darkGray
                    }}>
                    {extractDaysOnly(item.lianeRequest)}
                  </AppText>
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
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grayBackground,
    padding: 15
  }
});
