import React, { useMemo, useState } from "react";
import { Pressable, RefreshControl, SectionBase, SectionList, SectionListData, SectionListRenderItemInfo, StyleSheet, View } from "react-native";
import { LianeView } from "@/components/trip/LianeView";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors";
import { formatMonthDay } from "@/api/i18n";
import { Liane, PaginatedResponse, UTCDateTime } from "@/api";
import { WithFetchResource, WithFetchResourceProps } from "@/components/base/WithFetchResource";
import { Column, Row } from "@/components/base/AppLayout";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppCustomIcon, AppIcon } from "@/components/base/AppIcon";
import { AppButton } from "@/components/base/AppButton";
import { useQueryClient } from "react-query";

interface TripSection extends SectionBase<Liane> {
  date: string;
}

const MyTripsScreen = ({ data, navigation }: WithFetchResourceProps<PaginatedResponse<Liane>>) => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries(LianeQueryKey);
    setRefreshing(false);
  };
  // Create section list from a list of Liane objects
  const sections = useMemo(() => convertToDateSections(data.data), [data]);

  // Render individual Liane items
  const renderItem = ({ item, index, section }: SectionListRenderItemInfo<Liane, TripSection>) => {
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
          {item.group && (
            <Pressable
              onPress={() => navigation.navigate("Chat")}
              style={{ alignItems: "flex-end", position: "absolute", padding: 4, top: -12, right: -4 }}>
              <AppCustomIcon name={"message-circle-full"} size={32} color={AppColors.blue} />
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
              backgroundColor: item.driver ? ContextualColors.greenValid.bg : AppColorPalettes.gray[100]
            }}>
            <AppCustomIcon name={item.driver ? "car-check-mark" : "car-strike-through"} />
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

  // Render section header using date as key
  const renderSectionHeader = ({ section: { date } }: { section: SectionListData<Liane, TripSection> }) => (
    <View style={[styles.header, styles.grayBorder]}>
      <AppText style={styles.headerTitle}>{date}</AppText>
    </View>
  );

  return (
    <Column spacing={16} style={styles.container}>
      <AppButton
        icon="plus-outline"
        title="Nouvelle Liane"
        onPress={() => {
          navigation.navigate("LianeWizard");
        }}
      />

      <SectionList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        sections={sections}
        renderItem={renderItem}
        keyExtractor={item => item.id}
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

const convertToDateSections = (data: Liane[]): TripSection[] =>
  Object.entries(
    data.reduce((tmp, item) => {
      // Get formatted date for local timezone
      const group = formatMonthDay(new Date(item.departureTime));
      // Add item to this group (or create the group)

      if (!tmp[group]) {
        tmp[group] = [item];
      } else {
        tmp[group].push(item);
      }
      // add this item to its group

      return tmp;
    }, {} as { [key: UTCDateTime]: Liane[] })
  ).map(([group, items]) => ({ date: group, data: items } as TripSection));

export const LianeQueryKey = "getLianes";
export default WithFetchResource(MyTripsScreen, repository => repository.liane.list(), LianeQueryKey);
