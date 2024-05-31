import React, { useContext, useMemo } from "react";

import { Pressable, RefreshControl, SectionBase, SectionList, SectionListData, SectionListRenderItemInfo, StyleSheet, View } from "react-native";
import { CoLianeMatch, Ref, User } from "@liane/common";
import { useAppNavigation } from "@/components/context/routing";
import { AppContext } from "@/components/context/ContextProvider";
import { AppIcon } from "@/components/base/AppIcon";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors, WithAlpha } from "@/theme/colors";
import Eye from "@/assets/images/eye-fill.svg";
import EyeOff from "@/assets/images/eye-off-fill.svg";
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
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={onRefresh} />}
      sections={sections}
      showsVerticalScrollIndicator={false}
      renderItem={props => renderItem({ ...props, onRefresh })}
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

const LianeRequestItem = ({ item, onRefresh }: { item: CoLianeMatch; onRefresh: (() => void) | undefined }) => {
  const { services, user } = useContext(AppContext);
  const { navigation } = useAppNavigation();
  const unreadLianes = useMemo(async () => {
    return await services.community.getUnreadLianes();
  }, []);

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

  const switchLianeRequestStatus = async () => {
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
  };

  return (
    <View style={{ justifyContent: "center", display: "flex", marginRight: 20 }}>
      <View>
        <Row style={styles.driverContainer}>
          <Row>
            <View style={styles.headerContainer}>
              <Pressable
                style={{
                  position: "absolute",
                  height: 48,
                  width: 48,
                  backgroundColor: item.lianeRequest?.isEnabled ? AppColors.primaryColor : "#979797",
                  marginLeft: 0,
                  marginTop: 0,
                  borderRadius: 16,
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 10
                }}
                onPress={switchLianeRequestStatus}>
                {item.lianeRequest?.isEnabled ? <Eye width={20} height={20} /> : <EyeOff width={20} height={20} />}
              </Pressable>
              <View
                style={{
                  backgroundColor: AppColors.backgroundColor,
                  marginLeft: 18,
                  paddingLeft: 30,
                  height: 71,
                  flex: 1,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: AppColors.grayBackground
                }}>
                <View style={{ padding: 10 }}>
                  <AppText
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      flexShrink: 1,
                      lineHeight: 27,
                      color: "black"
                    }}>{`${from.label} ➔ ${to.label}`}</AppText>
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
            </View>
          </Row>
        </Row>
      </View>

      <View style={styles.subRowsContainer}>
        {!!item.joinedLianes?.length &&
          item.joinedLianes.map(joinedLiane => (
            <Row key={joinedLiane.liane.id} style={styles.subRow}>
              <JoinedLianeView joinedLiane={joinedLiane} unreadMessage={!!(joinedLiane.liane.id && joinedLiane.liane.id in unreadLianes)} />
            </Row>
          ))}

        {!!item.matches?.length && (
          <Row style={styles.subRow}>
            <Pressable
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flex: 1, paddingVertical: 5 }}
              onPress={() => navigation.navigate("ListGroups", { groups: item.matches ?? [], lianeRequest: item.lianeRequest })}>
              <Row>
                <View style={styles.notificationDotContainer}>
                  <View style={styles.notificationDot} />
                </View>
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: "bold",
                    lineHeight: 23,
                    color: AppColors.orange,
                    marginLeft: 5
                  }}>
                  {item.matches.length === 1 ? "Voir le groupe disponible" : `Voir les ${item.matches.length} groupes disponibles`}
                </AppText>
              </Row>
              <AppIcon name={"arrow-right"} />
            </Pressable>
          </Row>
        )}

        {!item.joinedLianes?.length && (
          <Pressable
            style={[
              styles.subRow,
              {
                flexDirection: "row",
                alignItems: "center"
              }
            ]}
            onPress={deleteLiane}>
            <AppIcon name={"trash"} />
            <AppText
              style={{
                fontSize: 14,
                fontWeight: "bold",
                lineHeight: 23,
                color: "#7B0000",
                marginLeft: 5
              }}>
              Supprimer cette liane
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const renderItem = ({ item, onRefresh }: SectionListRenderItemInfo<CoLianeMatch, TripSection> & { onRefresh: (() => void) | undefined }) => {
  return (
    <View style={[]}>
      <LianeRequestItem item={item} onRefresh={onRefresh} />
    </View>
  );
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
  driverContainer: {
    alignItems: "center"
  },
  driverText: {
    fontSize: 16,
    fontWeight: "500",
    alignSelf: "center"
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center"
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
  subRowsContainer: {
    marginLeft: 28,
    marginRight: 10,
    backgroundColor: AppColors.backgroundColor,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    display: "flex"
  },
  subRow: {
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grayBackground,
    padding: 15
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
    alignItems: "center"
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 6,
    backgroundColor: AppColors.orange
  }
});
