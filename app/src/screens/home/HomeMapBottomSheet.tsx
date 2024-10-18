import { BoundingBox, CoLiane } from "@liane/common";
import { AppBottomSheet, AppBottomSheetHandleHeight, BottomSheetRefProps } from "@/components/base/AppBottomSheet.tsx";
import { AppColors } from "@/theme/colors.ts";
import { RefreshControl, SectionList } from "react-native";
import { LianeOnMapItem } from "@/screens/home/LianeOnMapItemView.tsx";
import React, { useMemo, useRef } from "react";
import { TripSection } from "@/screens/home/HomeScreen.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HomeMapBottomSheetProps = {
  colianes?: CoLiane[];
  isFetching: boolean;
  currentBoundbox?: BoundingBox;
  fetchLianeOnMap: (bound: BoundingBox) => void;
};
export const HomeMapBottomSheetContainer = ({ colianes, isFetching, currentBoundbox, fetchLianeOnMap }: HomeMapBottomSheetProps) => {
  const refBottomSheet = useRef<BottomSheetRefProps>(null);
  const insets = useSafeAreaInsets();
  const { navigation } = useAppNavigation<"Home">();

  const convertToDateSections = (data: CoLiane[]): TripSection[] =>
    data.map(
      item =>
        ({
          data: [item]
        } as TripSection)
    );
  const sections = useMemo(() => {
    return colianes ? convertToDateSections(colianes) : [];
  }, [colianes]);

  return (
    <AppBottomSheet
      ref={refBottomSheet}
      stops={[AppBottomSheetHandleHeight + 60 + insets.bottom, 0.45, 1]}
      padding={{ top: 80 }}
      initialStop={1}
      backgroundStyle={{
        backgroundColor: AppColors.gray100
      }}
      handlerColorStyle={{
        backgroundColor: AppColors.gray100
      }}>
      <SectionList
        style={{ padding: 5, marginBottom: 56 + insets.bottom, marginTop: 3 }}
        refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={() => currentBoundbox && fetchLianeOnMap(currentBoundbox)} />}
        sections={sections}
        showsVerticalScrollIndicator={false}
        renderItem={props => LianeOnMapItem({ ...props, openLiane: () => navigation.navigate("LianeMapDetail", { liane: props.item }) })}
        keyExtractor={item => item.id!}
        onEndReachedThreshold={0.2}
      />
    </AppBottomSheet>
  );
};
