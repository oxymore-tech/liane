import { ParamListBase } from "@react-navigation/native";
import { LianeMatch, LianeSearchFilter } from "@/api";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FlatList, ListRenderItemInfo, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import { Column, Row } from "@/components/base/AppLayout";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors";
import { AppText } from "@/components/base/AppText";
import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import { formatMonthDay, formatTime } from "@/api/i18n";
import { AppRoundedButton } from "@/components/base/AppRoundedButton";
import { NoItemPlaceholder } from "@/components/NoItemPlaceholder";
import { toLianeRequest } from "@/screens/search/SearchFormData";
import { WithFetchPaginatedResponse } from "@/components/base/WithFetchPaginatedResponse";
import { LianeMatchView } from "@/components/trip/LianeMatchView";
import { formatDuration } from "@/util/datetime";

export interface SearchResultsScreenParams extends ParamListBase {
  filter: LianeSearchFilter;
}

const formatWholeDatetime = (date: Date) => {
  return `${formatMonthDay(date)} à ${formatTime(date)}`;
};

export const SearchResultsScreen = ({ route, navigation }: NativeStackScreenProps<SearchResultsScreenParams, "SearchResults">) => {
  const filter: LianeSearchFilter = route.params!.filter;
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Row style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <Pressable style={{ paddingVertical: 8, paddingHorizontal: 16 }} onPress={() => navigation.goBack()}>
          <AppIcon name={"arrow-ios-back-outline"} size={24} color={AppColors.white} />
        </Pressable>
        <Column style={{ flexShrink: 1, flexGrow: 1 }}>
          <Row style={{ alignItems: "center" }} spacing={4}>
            <AppText style={styles.headerText}>{filter.from.city}</AppText>
            <AppIcon name={"arrow-forward-outline"} color={AppColors.white} size={14} />
            <AppText style={styles.headerText}>{filter.to.city}</AppText>
          </Row>
          <AppText style={styles.headerText}>{formatWholeDatetime(new Date(filter.targetTime.dateTime))}</AppText>
        </Column>
        <Pressable style={{ paddingVertical: 8, paddingHorizontal: 16 }} onPress={() => navigation.navigate("Search", { filter })}>
          <AppIcon name={"edit"} size={24} color={AppColors.white} />
        </Pressable>
      </Row>

      <ResultsView params={{ filter }} route={route} navigation={navigation} />
    </View>
  );
};

/* Filter row :
 {data.length > 0 && (
        <Row style={styles.infoContainer}>
          <Row
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              alignItems: "center",
              backgroundColor: AppColorPalettes.gray[200]
            }}>
            <AppText style={styles.infoText}>{data.length} résultats</AppText>
          </Row>

          <Row
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              alignItems: "center",
              backgroundColor: AppColorPalettes.blue[100]
            }}>
            <AppIcon name={"funnel-outline"} />
            <AppText style={styles.infoText}>Filtrer</AppText>
          </Row>
        </Row>
      )}
 */

const EmptyResultView = ({ route, navigation }) => (
  <NoItemPlaceholder
    action={
      <AppRoundedButton
        backgroundColor={AppColors.orange}
        text={"Ajouter une annonce"}
        onPress={() => {
          navigation.navigate("LianeWizard", { lianeRequest: toLianeRequest(route.params!.filter) });
        }}
      />
    }
  />
);

export const MatchQueryKey = "match";
const ResultsView = WithFetchPaginatedResponse(
  ({ data, navigation, route }) => {
    const renderMatchItem = ({ item }: ListRenderItemInfo<LianeMatch>) => {
      const isExactMatch = item.matchData.type === "ExactMatch";
      const tripDuration = item.wayPoints.map(w => w.duration).reduce((d, acc) => d + acc, 0) / 60; // Value in minutes

      return (
        <View>
          <Row style={[styles.header, styles.grayBorder, { backgroundColor: AppColorPalettes.yellow[500] }]} spacing={4}>
            <AppText style={styles.headerTitle}>{formatWholeDatetime(new Date(item.departureTime))}</AppText>
            <View style={{ marginLeft: 4, paddingLeft: 4, borderLeftWidth: 1, height: "100%" }} />

            <AppIcon name={"clock-outline"} size={18} />
            <AppText style={{ fontSize: 15 }}>{formatDuration(tripDuration)}</AppText>
          </Row>
          <Pressable
            onPress={() => {
              navigation.navigate({
                name: "LianeMatchDetail",
                params: { lianeMatch: item, filter: route.params!.filter }
              });
            }}
            style={[styles.item, styles.grayBorder, styles.itemLast]}>
            <LianeMatchView match={item} filter={route.params!.filter} />

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
                  isExactMatch ? styles.exactMatchBg : styles.compatibleMatchBg
                ]}>
                {isExactMatch ? <AppIcon name={"arrow-up"} size={20} /> : <AppCustomIcon name={"twisting-arrow"} size={20} />}
                <AppText style={{ fontSize: 16 }}>{isExactMatch ? "Trajet exact" : "Trajet compatible"}</AppText>
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
                <AppCustomIcon name={item.driver ? "car-check-mark" : "car-strike-through"} />
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
                <AppText style={{ fontSize: 18 }}>{item.freeSeatsCount}</AppText>
                <AppIcon name={"people-outline"} size={22} />
              </Row>
            </Row>
            <View style={{ position: "absolute", right: 16, top: -16 }} />
          </Pressable>
        </View>
      );
    };

    return <FlatList keyExtractor={i => i.liane} data={data} renderItem={renderMatchItem} style={{ padding: 16 }} />;
  },
  (repository, params) => repository.liane.match(params.filter),
  MatchQueryKey,
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
  headerContainer: {
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
    backgroundColor: ContextualColors.greenValid.bg
  },
  compatibleMatchBg: {
    backgroundColor: ContextualColors.orangeWarn.bg
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
