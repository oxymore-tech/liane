import React, { useContext, useEffect, useMemo, useState } from "react";

import { Pressable, RefreshControl, SectionBase, SectionList, SectionListData, SectionListRenderItemInfo, StyleSheet, View } from "react-native";
import {
  CoLiane,
  CoLianeMatch,
  CoLianeRequest,
  JoinLianeRequestDetailed,
  Liane,
  MatchGroup,
  RallyingPoint,
  Ref,
  User,
  WayPoint
} from "@liane/common";
import { useAppNavigation } from "@/components/context/routing";
import { AppContext } from "@/components/context/ContextProvider";
import { AppIcon } from "@/components/base/AppIcon";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import { useObservable } from "@/util/hooks/subscription";
import Eye from "@/assets/images/eye-fill.svg";
import EyeOff from "@/assets/images/eye-off-fill.svg";
import groups, { GroupeCovoiturage } from "../../util/Mock/groups";
import { extractDays } from "@/util/hooks/days";
import { JoinedLianeView } from "@/components/communities/JoinedLianeView";
import { AppLogger } from "@/api/logger";
import { extractDaysTimes, extractWaypointFromTo } from "@/util/hooks/lianeRequest";

export interface TripSection extends SectionBase<CoLianeMatch> {}

export interface LianeListViewProps {
  data: CoLianeMatch[];
  isFetching?: boolean;
  onRefresh?: () => void;
  reverseSort?: boolean;
  loadMore?: () => void;
}

export const LianeListView = ({ data, isFetching, onRefresh, reverseSort, loadMore }: LianeListViewProps) => {
  const { user } = useContext(AppContext);
  const userId = user!.id!;
  const sections = useMemo(() => {
    return convertToDateSections(data, userId, reverseSort);
  }, [data, userId, reverseSort]);
  return (
    <SectionList
      style={{ flex: 1, marginLeft: 20, marginRight: 20, overflow: "visible" }}
      refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={onRefresh} />}
      sections={sections}
      showsVerticalScrollIndicator={false}
      renderItem={renderItem}
      keyExtractor={item => item.lianeRequest.id!}
      onEndReachedThreshold={0.2}
      onEndReached={loadMore}
      renderSectionHeader={renderSectionHeader}
    />
  );
};

const convertToDateSections = (data: CoLianeMatch[], member: Ref<User>, reverseSort: boolean = false): TripSection[] =>
  data.map(
    item =>
      ({
        data: [item]
      } as TripSection)
  );

const LianeRequestItem = ({ item }: { item: CoLianeMatch }) => {
  const { services, user } = useContext(AppContext);
  const { navigation } = useAppNavigation();

  const unread = useObservable(services.realTimeHub.unreadConversations, undefined);

  console.log("################### item", item);
  const { to, from, steps } = useMemo(() => extractWaypointFromTo(item.lianeRequest?.wayPoints), [item.lianeRequest.wayPoints]);

  const deleteLiane = async () => {
    const lianeRequest = item.lianeRequest;

    if (lianeRequest && lianeRequest.id) {
      try {
        const result = await services.community.delete(lianeRequest.id);
        AppLogger.debug("COMMUNITIES", "Suppression d'une liane avec succès", result);
      } catch (error) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors de la suppression d'une liane", error);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de liane ID lors de la suppression d'une liane", item);
    }
  };

  const switchLianeRequestStatus = async () => {
    const lianeRequest = item.lianeRequest;

    if (lianeRequest && lianeRequest.id) {
      lianeRequest.isEnabled = !lianeRequest.isEnabled;

      try {
        const updatedLianeRequest = await services.community.update(lianeRequest.id, lianeRequest);
        AppLogger.debug("COMMUNITIES", "Changement du status d'une liane fait avec succès", updatedLianeRequest);
      } catch (error) {
        AppLogger.debug("COMMUNITIES", "Une erreur est survenue lors du changement du status d'une liane", error);
      }
    } else {
      AppLogger.debug("COMMUNITIES", "Pas de lianeRequest lors du changement du status d'une liane", lianeRequest);
    }
  };

  return (
    <View>
      <View>
        <Row style={styles.driverContainer}>
          <Row spacing={8} style={{}}>
            <View style={styles.headerContainer}>
              <Pressable
                style={{
                  height: 48,
                  width: 48,
                  backgroundColor: item.lianeRequest?.isEnabled ? AppColors.primaryColor : "#979797",
                  marginLeft: -16,
                  marginTop: 10,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center"
                }}
                onPress={switchLianeRequestStatus}>
                {item.lianeRequest?.isEnabled ? <Eye width={20} height={20} /> : <EyeOff width={20} height={20} />}
              </Pressable>
              <View style={{ padding: 10 }}>
                <AppText
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    flexShrink: 1,
                    lineHeight: 27,
                    color: "black"
                  }}>{`${from} ➔ ${to}`}</AppText>
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: "400",
                    flexShrink: 1,
                    lineHeight: 16,
                    color: "black"
                  }}>
                  {extractDaysTimes(item.lianeRequest)}
                </AppText>
              </View>
            </View>
          </Row>
        </Row>

        <View style={styles.lianeContainer}>
          {item.joinedLianes &&
            item.joinedLianes.map((joinedLiane, index) => {
              return (
                <View
                  style={{
                    backgroundColor: AppColors.backgroundColor,
                    width: "100%"
                  }}>
                  <JoinedLianeView key={index} joinedLiane={joinedLiane} />
                </View>
              );
            })}
        </View>
      </View>

      {groups && (
        <Row style={{ flex: 1, alignItems: "center", marginTop: 20, marginBottom: 20, marginLeft: 5 }} spacing={8}>
          <Pressable
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }}
            onPress={() => navigation.navigate("ListGroups", { groups: item.matches ?? [], lianeRequest: item.lianeRequest })}>
            <Row>
              <View style={styles.notificationDotContainer}>
                <View style={styles.notificationDot} />
              </View>
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  lineHeight: 23,
                  color: AppColors.orange,
                  marginLeft: 5
                }}>
                {`Voir les ${item.matches?.length}`} groupes disponibles
              </AppText>
            </Row>
            <Row>
              <View
                style={{
                  marginRight: 10
                }}>
                <AppIcon name={"arrow-right"} />
              </View>
            </Row>
          </Pressable>
        </Row>
      )}
      {!item.joinedLianes?.length && (
        <Pressable
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            paddingTop: 20,
            marginBottom: 20,
            borderTopWidth: 1,
            paddingLeft: 8,
            borderTopColor: AppColors.grayBackground
          }}
          onPress={deleteLiane}>
          <AppIcon name={"trash"} />
          <AppText
            style={{
              fontSize: 14,
              fontWeight: "600",
              lineHeight: 23,
              color: "#7B0000",
              marginLeft: 5
            }}>
            Supprimer cette liane
          </AppText>
        </Pressable>
      )}
    </View>
  );
};

const renderLianeItem = ({ item, index, section }: SectionListRenderItemInfo<CoLianeMatch, TripSection>) => {
  return (
    <View style={[styles.item, styles.grayBorder, styles.itemLast]}>
      <LianeRequestItem item={item} />
    </View>
  );
};

const renderItem = ({ item, index, section }: SectionListRenderItemInfo<CoLianeMatch, TripSection>) => {
  // @ts-ignore
  return renderLianeItem({ item, index, section });
};

const renderSectionHeader = ({ section: {} }: { section: SectionListData<CoLianeMatch, TripSection> }) => <View style={styles.header} />;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 26,
    height: "100%"
  },
  grayBorder: {
    borderColor: AppColorPalettes.gray[200]
  },
  header: {
    padding: 6,
    paddingBottom: 12,
    height: 32,
    backgroundColor: "transparent"
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold"
  },
  disabledItem: { backgroundColor: WithAlpha(AppColors.white, 0.7) },
  item: {
    paddingVertical: 8,
    paddingBottom: 12,
    backgroundColor: AppColors.backgroundColor,
    borderBottomWidth: 1
  },
  itemFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  itemLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingBottom: 0,
    borderBottomWidth: 0
  },
  driverContainer: {
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    backgroundColor: AppColors.backgroundColor
  },
  driverText: {
    fontSize: 16,
    fontWeight: "500",
    alignSelf: "center"
  },
  headerContainer: {
    backgroundColor: AppColors.backgroundColor,
    height: 71,
    width: "104%",
    maxWidth: "104%",
    marginLeft: "-2%",
    marginTop: -8,
    borderRadius: 8,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: AppColors.grayBackground
  },
  informatioContainer: {
    fontSize: 16,
    fontWeight: "500"
  },
  geolocText: {
    marginBottom: -2,
    alignSelf: "center"
  },
  geolocSwitch: {
    marginBottom: -4
  },
  lianeContainer: {
    flexGrow: 1
  },
  chatButton: {
    alignItems: "flex-end",
    position: "absolute",
    padding: 4,
    top: -8,
    right: -4
  },
  chatBadge: {
    backgroundColor: AppColors.primaryColor,
    borderRadius: 16,
    padding: 6,
    top: 4,
    right: 4,
    position: "absolute"
  },
  relaunchStatus: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: AppColorPalettes.gray[100]
  },
  statusRowContainer: {
    flex: 1,
    alignItems: "center",
    marginVertical: 8,
    height: 32
  },
  infoRowContainer: {
    flex: 1,
    alignItems: "center",
    marginTop: 15,
    marginBottom: 15
  },
  infoContainer: {
    paddingHorizontal: 4
  },
  infoTravel: {
    fontSize: 16,
    marginLeft: 6,
    color: AppColorPalettes.gray[500]
  },
  infoText: {
    fontSize: 14,
    color: AppColorPalettes.gray[600]
  },
  infoIcon: {
    marginTop: 2
  },
  statusContainer: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: "center",
    backgroundColor: AppColorPalettes.gray[100]
  },
  validationContainer: {
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: AppColors.primaryColor,
    padding: 4,
    paddingLeft: 12,
    marginHorizontal: 4
  },
  validationText: {
    fontWeight: "bold",
    color: AppColors.white,
    marginRight: 8
  },
  bottomView: {
    position: "absolute",
    right: 16,
    top: -16
  },
  notificationDotContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8 // Espace entre le texte et le point de notification
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: AppColors.orange
  }
});
