import React, { useMemo } from "react";
import { Pressable, SectionBase, SectionList, SectionListData, SectionListRenderItemInfo, StyleSheet, View } from "react-native";
import { LianeView } from "@/components/LianeView";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { formatMonthDay } from "@/api/i18n";
import { Liane, UTCDateTime } from "@/api";
import { WithFetchResource, WithFetchResourceProps } from "@/components/base/WithFetchResource";
import { AppButton } from "@/components/base/AppButton";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQueryClient } from "react-query";
import { Column } from "@/components/base/AppLayout";
import { LianeModalScreenResponseParams } from "@/screens/lianeWizard/LianeModalScreen";

interface TripSection extends SectionBase<Liane> {
  date: string;
}

const MyTripsScreen = ({ data, navigation, route }: WithFetchResourceProps<Liane[]> & NativeStackScreenProps<LianeModalScreenResponseParams>) => {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    // Update react query cache
    if (route.params?.lianeResponse) {
      const liane = route.params?.lianeResponse;
      if (__DEV__) {
        console.log("Update cache with liane", liane);
      }
      queryClient.setQueryData<Liane[]>(LianeQueryKey, oldData => {
        if (oldData) {
          return [liane, ...oldData];
        } else {
          return [liane];
        }
      });
    }
  }, [queryClient, route.params?.lianeResponse]);

  // Create section list from a list of Liane objects
  const sections = useMemo(() => convertToDateSections(data), [data]);

  // Render individual Liane items
  const renderItem = ({ item, index, section }: SectionListRenderItemInfo<Liane, TripSection>) => (
    <Pressable
      onPress={() => {
        navigation.navigate({
          name: "LianeDetail",
          params: { liane: item }
        });
      }}
      style={[styles.item, styles.grayBorder, index === section.data.length - 1 ? styles.itemLast : {}]}>
      <LianeView liane={item} />
    </Pressable>
  );

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
          navigation.navigate("LianeWizard", {
            origin: route.name
          });
        }}
      />

      <SectionList
        sections={sections}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={s => <View style={{ height: s.section === sections[sections.length - 1] ? 96 : 24 }} />}
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
export default WithFetchResource(MyTripsScreen, repository => repository.liane.get, LianeQueryKey);
