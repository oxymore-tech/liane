import React, { useMemo } from "react";
import {
  SectionBase, SectionList, SectionListData, SectionListRenderItemInfo, StyleSheet, View
} from "react-native";
import { LianeModalScreen } from "@/screens/LianeModalScreen";
import { LianeView } from "@/components/LianeView";
import { AppText } from "@/components/base/AppText";
import { AppColors } from "@/theme/colors";
import { formatMonthDay } from "@/api/i18n";
import { Liane, DateOnly } from "@/api";
import { WithFetchResource, WithFetchResourceProps } from "@/components/base/WithFetchResource";
import { getLianes } from "@/api/repository/liane";

interface TripSection extends SectionBase<Liane> {
  date: string;
}

const MyTripsScreen = ({ data }: WithFetchResourceProps<Liane[]>) => {

  // Create section list from a list of Liane objects
  const sections = useMemo(() => convertToDateSections(data), [data]);

  // Render individual Liane items
  const renderItem = ({ item, index, section }: SectionListRenderItemInfo<Liane, TripSection>) => (
    <View style={[styles.item, styles.grayBorder, index === section.data.length - 1 ? styles.itemLast : {}]}>
      <LianeView liane={item} />
    </View>
  );

  // Render section header using date as key
  const renderSectionHeader = ({ section: { date } } : { section: SectionListData<Liane, TripSection> }) => (
    <View style={[styles.header, styles.grayBorder]}>
      <AppText style={styles.headerTitle}>{formatMonthDay(Date.parse((date)))}</AppText>
    </View>
  );
  return (

    <View style={styles.container}>
      <LianeModalScreen />
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={() => (
          <View style={styles.sectionSeparator} />
        )}
      />

    </View>

  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    height: "100%"
  },
  grayBorder: {
    borderColor: AppColors.gray200
  },
  header: {
    backgroundColor: AppColors.yellow500,
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
  },
  sectionSeparator: {
    height: 24
  }
});

const convertToDateSections = (data: Liane[]): TripSection[] => Object.entries(data.reduce((tmp, item) => {
  const group = item.date;

  // Add item to this group (or create the group)
  // eslint-disable-next-line no-param-reassign
  if (!tmp[group]) tmp[group] = [item];
  else tmp[group].push(item);
  // add this item to its group

  return tmp;
}, {} as { [key: DateOnly]: Liane[]; })).map(([group, items]) => ({ date: group, data: items } as TripSection));

export default WithFetchResource(MyTripsScreen, getLianes);