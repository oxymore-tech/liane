import React, { useContext, useLayoutEffect } from "react";

import { FlatList, RefreshControl } from "react-native";
import { CoLianeMatch } from "@liane/common";
import { AppContext } from "@/components/context/ContextProvider";
import { LianeRequestItem } from "@/components/communities/LianeRequestItemView.tsx";
import { AppText } from "@/components/base/AppText.tsx";
import { AppStyles } from "@/theme/styles.ts";
import { Center } from "@/components/base/AppLayout.tsx";
import { useObservable } from "@/util/hooks/subscription.ts";

export type LianeListViewProps = {
  data: CoLianeMatch[];
  isFetching?: boolean;
  onRefresh?: () => void;
  loadMore?: () => void;
};

export const LianeListView = ({ data, isFetching, onRefresh, loadMore }: LianeListViewProps) => {
  const { services } = useContext(AppContext);

  const unreadLianes = useObservable(services.realTimeHub.unreadNotifications, {});

  useLayoutEffect(() => {
    services.realTimeHub.askForOverview().then();
  }, [services.realTimeHub]);

  return (
    <FlatList
      style={{ flex: 1 }}
      refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={onRefresh} />}
      data={data}
      ListEmptyComponent={
        <Center>
          <AppText style={AppStyles.noData}>Vous n'avez aucune liane pour le moment.</AppText>
        </Center>
      }
      showsVerticalScrollIndicator={false}
      renderItem={props => <LianeRequestItem {...props} onRefresh={onRefresh} unreadLianes={unreadLianes} />}
      keyExtractor={item => item.lianeRequest.id!}
      onEndReachedThreshold={0.2}
      onEndReached={loadMore}
    />
  );
};
