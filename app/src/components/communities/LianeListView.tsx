import React, { useContext, useEffect, useMemo, useState } from "react";

import { RefreshControl, SectionBase, SectionList, SectionListData, StyleSheet, View } from "react-native";
import { CoLianeMatch } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { LianeRequestItem } from "@/components/communities/LianeRequestItemView.tsx";

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

const renderSectionHeader = ({ section: {} }: { section: SectionListData<CoLianeMatch, TripSection> }) => <View style={styles.header} />;

const styles = StyleSheet.create({
  header: {
    padding: 6,
    paddingBottom: 0,
    backgroundColor: "transparent"
  }
});
