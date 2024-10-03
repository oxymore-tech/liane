import React, { useContext, useEffect, useMemo, useState } from "react";

import { Pressable, RefreshControl, SectionBase, SectionList, SectionListData, StyleSheet, View } from "react-native";
import { CoLianeMatch } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { AppIcon } from "@/components/base/AppIcon";
import { Row } from "@/components/base/AppLayout";
import { AppText } from "@/components/base/AppText";
import { AppColors } from "@/theme/colors";
import Eye from "@/assets/images/eye-fill.svg";
import EyeOff from "@/assets/images/eye-off-fill.svg";
import { JoinedLianeView } from "@/components/communities/JoinedLianeView";
import { AppLogger } from "@/api/logger";
import { extractDaysTimes, extractWaypointFromTo } from "@/util/hooks/lianeRequest";
import { DetachedLianeItem } from "@/components/communities/DetachedLianeItem.tsx";

export interface TripSection extends SectionBase<CoLianeMatch> {}

export interface LianeListViewProps {
  data: CoLianeMatch[];
  isFetching?: boolean;
  onRefresh?: () => void;
  loadMore?: () => void;
}

export const LianeListView = ({ data, isFetching, onRefresh, loadMore }: LianeListViewProps) => {
  const { services } = useContext(AppContext);
  const [unreadLianes, setUnreadLianes] = useState<Record<string, number>>({});

  const sections = useMemo(() => {
    return convertToDateSections(data);
  }, [data]);
  useEffect(() => {
    services.community.getUnreadLianes().then(setUnreadLianes);
  }, [services.community]);
  return (
    <SectionList
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={onRefresh} />}
      sections={sections}
      showsVerticalScrollIndicator={false}
      renderItem={props => <LianeRequestItem {...props} onRefresh={onRefresh} unreadLianes={unreadLianes} />}
      keyExtractor={item => item.lianeRequest.id!}
      onEndReachedThreshold={0.2}
      onEndReached={loadMore}
      renderSectionHeader={renderSectionHeader}
    />
  );
};

const convertToDateSections = (data: CoLianeMatch[]): TripSection[] =>
  data.map(
    item =>
      ({
        data: [item]
      } as TripSection)
  );

type LianeRequestItemProps = {
  item: CoLianeMatch;
  onRefresh: (() => void) | undefined;
  unreadLianes: Record<string, number>;
};

const LianeRequestItem = ({ item, onRefresh, unreadLianes }: LianeRequestItemProps) => {
  const { services } = useContext(AppContext);

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
                <AppText
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    flexShrink: 1,
                    lineHeight: 27,
                    color: "black"
                  }}
                />
                <View style={{ padding: 10 }}>
                  <AppText
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      flexShrink: 1,
                      lineHeight: 27,
                      color: "black"
                    }}>
                    {!item?.lianeRequest?.name ? `${from.label} ➔ ${to.label}` : `${item?.lianeRequest?.name}`}
                  </AppText>
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
        {item.state.type === "Detached" && <DetachedLianeItem lianeRequest={item.lianeRequest} state={item.state} />}

        {item.state.type === "Pending" && (
          <Row style={styles.subRow}>
            <AppText style={{ fontSize: 14, fontWeight: "bold", lineHeight: 23, color: AppColors.orange }}>
              Cette liane est en attente de conducteur
            </AppText>
          </Row>
        )}

        {item.state.type === "Attached" && (
          <Row style={styles.subRow}>
            <JoinedLianeView
              lianeRequest={item.lianeRequest}
              liane={item.state.liane}
              unreadMessage={!!(item.state.liane.id && item.state.liane.id in unreadLianes)}
            />
          </Row>
        )}

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
      </View>
    </View>
  );
};

const renderSectionHeader = ({ section: {} }: { section: SectionListData<CoLianeMatch, TripSection> }) => <View style={styles.header} />;

const styles = StyleSheet.create({
  header: {
    padding: 6,
    paddingBottom: 12,
    height: 32,
    backgroundColor: "transparent"
  },
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
    backgroundColor: AppColors.backgroundColor,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    display: "flex"
  },
  subRow: {
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grayBackground,
    padding: 15
  }
});
