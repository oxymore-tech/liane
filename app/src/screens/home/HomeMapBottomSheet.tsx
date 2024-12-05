import { BoundingBox, CoLiane } from "@liane/common";
import { AppColorPalettes } from "@/theme/colors.ts";
import { FlatList, RefreshControl } from "react-native-gesture-handler";
import { LianeOnMapItem } from "@/screens/home/LianeOnMapItemView.tsx";
import React, { useCallback, useContext, useRef } from "react";
import { useAppNavigation } from "@/components/context/routing.ts";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBottomSheet, BottomSheetRefProps } from "@/components/base/AppBottomSheet.tsx";
import { AppText } from "@/components/base/AppText.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { Column } from "@/components/base/AppLayout.tsx";

type HomeMapBottomSheetProps = {
  lianes?: CoLiane[];
  isFetching: boolean;
  currentBoundbox?: BoundingBox;
  fetchLianeOnMap: (bound: BoundingBox) => void;
};

export const HomeMapBottomSheetContainer = ({ lianes = [], isFetching, currentBoundbox, fetchLianeOnMap }: HomeMapBottomSheetProps) => {
  const refBottomSheet = useRef<BottomSheetRefProps>(null);
  const insets = useSafeAreaInsets();
  const { navigation } = useAppNavigation<"Home">();
  const { user } = useContext(AppContext);

  const openLiane = useCallback(
    (liane: CoLiane) => {
      const me = liane.members.find(m => m.user.id === user?.id);
      if (me) {
        navigation.navigate("CommunitiesChat", { liane });
      } else {
        navigation.navigate("LianeMapDetail", { liane });
      }
    },
    [navigation, user]
  );

  return (
    <AppBottomSheet
      ref={refBottomSheet}
      stops={[insets.bottom, 0.45, 1]}
      initialStop={1}
      style={{
        backgroundColor: AppColorPalettes.gray[700]
      }}>
      <Column style={{ backgroundColor: AppColorPalettes.gray[700] }}>
        <AppText
          style={{
            color: AppColorPalettes.gray[100],
            fontSize: 16,
            textAlign: "center"
          }}>
          {lianes.length === 0
            ? "Déplacez-vous sur la carte"
            : `${lianes.length} liane${lianes.length > 1 ? "s" : ""} disponible${lianes.length > 1 ? "s" : ""} dans cette zone`}
        </AppText>
        <FlatList
          style={{ marginHorizontal: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => currentBoundbox && fetchLianeOnMap(currentBoundbox)} />}
          data={lianes}
          renderItem={props => <LianeOnMapItem {...props} openLiane={openLiane} />}
          keyExtractor={item => item.id!}
          onEndReachedThreshold={0.2}
          contentContainerStyle={{ marginBottom: 100, paddingBottom: 250 }}
        />
      </Column>
    </AppBottomSheet>
  );
};
