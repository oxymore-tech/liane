import React, { useContext, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionBase,
  SectionList,
  SectionListData,
  SectionListRenderItemInfo,
  StyleSheet,
  View
} from "react-native";
import { LianeView } from "@/components/trip/LianeView";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors";
import { formatMonthDay } from "@/api/i18n";
import { JoinLianeRequestDetailed, Liane, UTCDateTime } from "@/api";
import { Center, Column, Row } from "@/components/base/AppLayout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon } from "@/components/base/AppIcon";
import { AppButton } from "@/components/base/AppButton";
import { useAppNavigation } from "@/api/navigation";
import { useQueries } from "react-query";
import { AppContext } from "@/components/ContextProvider";
import { UnauthorizedError } from "@/api/exception";
import { JoinRequestSegmentOverview } from "@/components/trip/JoinRequestSegmentOverview";
import { extractDatePart } from "@/util/datetime";
import { capitalize } from "@/util/strings";

interface TripSection extends SectionBase<Liane | JoinLianeRequestDetailed> {
  date: string;
}

const renderLianeItem = ({ item, index, section }: SectionListRenderItemInfo<Liane, TripSection>) => {
  const { navigation } = useAppNavigation();
  return (
    <Pressable
      onPress={() => {
        navigation.navigate({
          name: "LianeDetail",
          params: { liane: item }
        });
      }}
      style={[styles.item, styles.grayBorder, index === section.data.length - 1 ? styles.itemLast : {}]}>
      <View>
        <View style={{ flexGrow: 1, marginRight: 40 }}>
          <LianeView liane={item} />
        </View>
        {item.conversation && (
          <Pressable
            onPress={() => navigation.navigate("Chat", { conversationId: item.conversation, liane: item })}
            style={{ alignItems: "flex-end", position: "absolute", padding: 4, top: -12, right: -4 }}>
            <AppIcon name={"message-circle-full"} size={32} color={AppColors.blue} />
          </Pressable>
        )}
      </View>

      <Row
        style={{ flex: 1, justifyContent: "flex-start", paddingTop: 8, borderTopWidth: 1, marginTop: 16, borderColor: AppColorPalettes.gray[100] }}
        spacing={8}>
        <Row
          style={{
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderRadius: 4,
            alignItems: "center",
            backgroundColor: item.driver.canDrive ? ContextualColors.greenValid.light : AppColorPalettes.gray[100]
          }}>
          <AppIcon name={item.driver.canDrive ? "car-check-mark" : "car-strike-through"} />
        </Row>
        <Row
          style={{
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderRadius: 4,
            alignItems: "center",
            backgroundColor: AppColorPalettes.gray[100]
          }}>
          <AppText style={{ fontSize: 18 }}>{item.members.length}</AppText>
          <AppIcon name={"people-outline"} />
        </Row>
      </Row>
      <View style={{ position: "absolute", right: 16, top: -16 }} />
    </Pressable>
  );
};

const renderItem = ({ item, index, section }: SectionListRenderItemInfo<Liane | JoinLianeRequestDetailed, TripSection>) => {
  const isRequest = isResolvedJoinLianeRequest(item);
  //console.log(JSON.stringify(item));
  if (!isRequest) {
    return renderLianeItem({ item, index, section });
  }

  // else render join request
  const { navigation } = useAppNavigation();
  return (
    <Pressable
      onPress={() => {
        navigation.navigate({
          name: "LianeJoinRequestDetail",
          params: { request: item }
        });
      }}
      style={[styles.item, styles.grayBorder, index === section.data.length - 1 ? styles.itemLast : {}]}>
      <View>
        <View style={{ flexGrow: 1, marginRight: 40 }}>
          <JoinRequestSegmentOverview request={item} />
        </View>
      </View>

      <Row
        style={{ flex: 1, justifyContent: "flex-start", paddingTop: 8, borderTopWidth: 1, marginTop: 16, borderColor: AppColorPalettes.gray[100] }}
        spacing={8}>
        <Row
          style={{
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderRadius: 4,
            alignItems: "center",
            backgroundColor: AppColorPalettes.gray[100]
          }}>
          <AppText>En attente de validation</AppText>
        </Row>
      </Row>
    </Pressable>
  );
};
const renderSectionHeader = ({ section: { date } }: { section: SectionListData<Liane | JoinLianeRequestDetailed, TripSection> }) => (
  <View style={[styles.header, styles.grayBorder]}>
    <AppText style={styles.headerTitle}>{capitalize(formatMonthDay(new Date(date)))}</AppText>
  </View>
);
const MyTripsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { services } = useContext(AppContext);
  const queriesData = useQueries([
    { queryKey: JoinRequestsQueryKey, queryFn: () => services.liane.listJoinRequests() },
    { queryKey: LianeQueryKey, queryFn: () => services.liane.list() }
  ]);

  const isLoading = queriesData[0].isLoading || queriesData[1].isLoading;

  const error = queriesData[0].error || queriesData[1].error;

  const isFetching = queriesData[0].isFetching || queriesData[1].isFetching;

  // Create section list from a list of Liane objects
  const sections = useMemo(() => {
    if (queriesData[0].data && queriesData[1].data) {
      const data = [...queriesData[0].data!.data, ...queriesData[1].data!.data];
      return convertToDateSections(data);
    }
    return [];
  }, [queriesData]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (error) {
    // Show content depending on the error or propagate it
    if (error instanceof UnauthorizedError) {
      throw error;
    } else {
      return (
        <View style={styles.container}>
          <AppText style={{ textAlign: "center" }}>
            Error:
            {error.message}
          </AppText>
          <Center>
            <AppButton
              color={AppColors.orange}
              title={"Réessayer"}
              icon={"refresh-outline"}
              onPress={() => {
                if (queriesData[0].error) {
                  queriesData[0].refetch();
                }
                if (queriesData[1].error) {
                  queriesData[1].refetch();
                }
              }}
            />
          </Center>
        </View>
      );
    }
  }

  return (
    <Column spacing={16} style={styles.container}>
      <AppButton
        icon="plus-outline"
        title="Nouvelle Liane"
        onPress={() => {
          navigation.navigate("Publish");
        }}
      />

      <SectionList
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => {
              queriesData.forEach(q => q.refetch());
            }}
          />
        }
        sections={sections}
        renderItem={renderItem}
        keyExtractor={item => item.id!}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={s => <View style={{ height: s.section === sections[sections.length - 1] ? 96 + insets.bottom : 24 }} />}
      />
    </Column>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    height: "100%"
  },
  grayBorder: {
    borderColor: AppColorPalettes.gray[200]
  },
  header: {
    backgroundColor: AppColorPalettes.yellow[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
    borderWidth: 1
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  item: {
    padding: 16,
    backgroundColor: AppColors.white,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1
  },
  itemLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16
  }
});

const isResolvedJoinLianeRequest = (item: Liane | JoinLianeRequestDetailed): item is JoinLianeRequestDetailed => {
  return (item as JoinLianeRequestDetailed).targetLiane !== undefined;
};

const convertToDateSections = (data: (Liane | JoinLianeRequestDetailed)[]): TripSection[] =>
  Object.entries(
    data.reduce((tmp, item) => {
      const liane: Liane = isResolvedJoinLianeRequest(item) ? item.targetLiane : item;
      // Use date for grouping
      const group = extractDatePart(liane.departureTime);
      // Add item to this group (or create the group)

      if (!tmp[group]) {
        tmp[group] = [item];
      } else {
        tmp[group].unshift(item);
      }
      // add this item to its group

      return tmp;
    }, {} as { [key: UTCDateTime]: (Liane | JoinLianeRequestDetailed)[] })
  )
    .map(([group, items]) => ({ date: group, data: items } as TripSection))
    .sort((a, b) => -a.date.localeCompare(b.date));

export const LianeQueryKey = "getLianes";
export const JoinRequestsQueryKey = "getJoinRequests";
export default MyTripsScreen;
