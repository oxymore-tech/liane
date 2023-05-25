import { Exact, getPoint, LianeMatch, UnionUtils } from "@/api";
import { FlatList, ListRenderItemInfo, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import { Row } from "@/components/base/AppLayout";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { AppIcon } from "@/components/base/AppIcon";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { NoItemPlaceholder } from "@/components/NoItemPlaceholder";
import { toLianeWizardFormData } from "@/screens/search/SearchFormData";
import { WithFetchPaginatedResponse } from "@/components/base/WithFetchPaginatedResponse";
import { LianeMatchView } from "@/components/trip/LianeMatchView";
import { formatDuration } from "@/util/datetime";
import { InternalLianeSearchFilter, toUnresolved } from "@/util/ref";
import { useAppNavigation } from "@/api/navigation";
import { formatDateTime } from "@/api/i18n";
import { TripOverviewHeader } from "@/components/trip/TripOverviewHeader";
import { getTotalDuration, getTrip } from "@/components/trip/trip";

export const SearchResultsScreen = () => {
  const { route, navigation } = useAppNavigation<"SearchResults">();
  const filter: InternalLianeSearchFilter = route.params!.filter;
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Row style={[styles.footerContainer, { paddingTop: insets.top + 12 }]}>
        <Pressable style={{ paddingVertical: 8, paddingHorizontal: 16 }} onPress={() => navigation.goBack()}>
          <AppIcon name={"arrow-ios-back-outline"} size={24} color={AppColors.white} />
        </Pressable>
        <TripOverviewHeader from={filter.from} to={filter.to} dateTime={filter.targetTime.dateTime} color={AppColors.white} />
        <Pressable style={{ paddingVertical: 8, paddingHorizontal: 16 }} onPress={() => navigation.navigate("Search", { filter })}>
          <AppIcon name={"edit"} size={24} color={AppColors.white} />
        </Pressable>
      </Row>

      <ResultsView params={{ filter }} route={route} navigation={navigation} />
    </View>
  );
};

const EmptyResultView = () => {
  const { route, navigation } = useAppNavigation<"SearchResults">();
  return (
    <NoItemPlaceholder
      action={
        <AppRoundedButton
          backgroundColor={AppColors.orange}
          text={"Ajouter une annonce"}
          onPress={() => {
            navigation.navigate("LianeWizard", { formData: toLianeWizardFormData(route.params!.filter) });
          }}
        />
      }
    />
  );
};

export const MatchQueryKey = "match";
const ResultsView = WithFetchPaginatedResponse<LianeMatch>(
  ({ data, refresh, refreshing }) => {
    const { route, navigation } = useAppNavigation<"SearchResults">();
    const filter = route.params!.filter;

    console.debug(JSON.stringify(data));
    const renderMatchItem = ({ item }: ListRenderItemInfo<LianeMatch>) => {
      const itemIsExactMatch = UnionUtils.isInstanceOf<Exact>(item.match, "Exact");
      const wayPoints = itemIsExactMatch ? item.liane.wayPoints : item.match.wayPoints;
      const fromPoint = getPoint(item, "pickup");
      const toPoint = getPoint(item, "deposit");
      const tripDuration = getTotalDuration(getTrip(item.liane.departureTime, wayPoints, toPoint.id, fromPoint.id).wayPoints);
      const departureDatetime = formatDateTime(new Date(item.liane.departureTime));

      return (
        <View>
          <Row style={[styles.header, styles.grayBorder, { backgroundColor: AppColorPalettes.yellow[500] }]} spacing={4}>
            <AppText style={styles.headerTitle}>{departureDatetime}</AppText>
            <View style={{ marginLeft: 4, paddingLeft: 4, borderLeftWidth: 1, height: "100%" }} />

            <AppIcon name={"clock-outline"} size={18} />
            <AppText style={{ fontSize: 15 }}>{formatDuration(tripDuration)}</AppText>
          </Row>
          <Pressable
            onPress={() => {
              navigation.navigate({
                name: "LianeMatchDetail",
                params: { lianeMatch: item, filter }
              });
            }}
            style={[styles.item, styles.grayBorder, styles.itemLast]}>
            <LianeMatchView
              from={fromPoint}
              to={toPoint}
              departureTime={item.liane.departureTime}
              originalTrip={item.liane.wayPoints}
              newTrip={wayPoints}
            />

            <Row
              style={{
                flex: 1,
                justifyContent: "flex-start",
                paddingTop: 8,
                borderTopWidth: 1,
                marginTop: 16,
                borderColor: AppColorPalettes.gray[100]
              }}
              spacing={8}>
              <Row
                spacing={8}
                style={[
                  {
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                    borderRadius: 4,
                    alignItems: "center"
                  },
                  itemIsExactMatch ? styles.exactMatchBg : styles.compatibleMatchBg
                ]}>
                {itemIsExactMatch ? <AppIcon name={"arrow-upward-outline"} size={20} /> : <AppIcon name={"twisting-arrow"} size={20} />}
                <AppText style={{ fontSize: 16 }}>{itemIsExactMatch ? "Trajet exact" : "Trajet compatible"}</AppText>
              </Row>
              <View style={{ flexGrow: 1 }} />
              <Row
                style={{
                  paddingHorizontal: 4,
                  paddingVertical: 2,
                  borderRadius: 4,
                  alignItems: "center",
                  backgroundColor: AppColorPalettes.gray[100]
                }}>
                <AppIcon name={item.liane.driver.canDrive ? "car-check-mark" : "car-strike-through"} />
              </Row>
              <Row
                spacing={4}
                style={{
                  paddingHorizontal: 4,
                  paddingVertical: 2,
                  borderRadius: 4,
                  alignItems: "center",
                  backgroundColor: AppColorPalettes.gray[100]
                }}>
                <AppText style={{ fontSize: 18 }}>{Math.abs(item.freeSeatsCount)}</AppText>
                <AppIcon name={"people-outline"} size={22} />
              </Row>
            </Row>
            <View style={{ position: "absolute", right: 16, top: -16 }} />
          </Pressable>
        </View>
      );
    };

    return (
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        keyExtractor={i => i.liane.id!}
        data={data}
        renderItem={renderMatchItem}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        style={{ padding: 16 }}
      />
    );
  },
  (repository, params) => repository.liane.match(toUnresolved(params.filter, ["to", "from"])),
  ({ filter }) => MatchQueryKey + JSON.stringify(filter),
  EmptyResultView
);

const styles = StyleSheet.create({
  headerText: {
    color: AppColors.white,
    fontSize: 16,
    textAlignVertical: "center"
  },
  infoContainer: {
    padding: 8,
    justifyContent: "space-between",
    alignItems: "center"
  },
  infoText: {
    fontSize: 16
  },
  footerContainer: {
    backgroundColor: AppColors.darkBlue,
    paddingVertical: 12
  },

  container: {
    marginHorizontal: 16,
    height: "100%"
  },
  grayBorder: {
    borderColor: AppColorPalettes.gray[200]
  },
  exactMatchBg: {
    backgroundColor: ContextualColors.greenValid.light
  },
  compatibleMatchBg: {
    backgroundColor: ContextualColors.orangeWarn.light
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
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
