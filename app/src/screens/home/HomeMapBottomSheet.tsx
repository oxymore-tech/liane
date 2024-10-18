import { BoundingBox, CoLiane, CoLianeMatch, ResolvedLianeRequest } from "@liane/common";
import { AppBottomSheet, AppBottomSheetHandleHeight, BottomSheetRefProps } from "@/components/base/AppBottomSheet.tsx";
import { AppColors, defaultTextColor } from "@/theme/colors.ts";
import { Pressable, RefreshControl, SectionList, View } from "react-native";
import { AppRoundedButton } from "@/components/base/AppRoundedButton.tsx";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { displayResolvedLiane } from "@/screens/communities/LianeMapDetail.tsx";
import { LianeOnMapItem } from "@/screens/home/LianeOnMapItemView.tsx";
import React, { useContext, useMemo, useRef, useState } from "react";
import { TripSection } from "@/screens/home/HomeScreen.tsx";
import { useAppNavigation } from "@/components/context/routing.ts";
import { AppContext } from "@/components/context/ContextProvider.tsx";

type HomeMapBottomSheetProps = {
  colianes?: CoLiane[];
  isFetching: boolean;
  currentBoundbox?: BoundingBox;
  fetchLianeOnMap: (bound: BoundingBox) => void;
};
export const HomeMapBottomSheetContainer = ({ colianes, isFetching, currentBoundbox, fetchLianeOnMap }: HomeMapBottomSheetProps) => {
  const [lianeDetail, setLianeDetail] = useState<ResolvedLianeRequest>();
  const refBottomSheet = useRef<BottomSheetRefProps>(null);
  const { navigation } = useAppNavigation<"Home">();
  const { user } = useContext(AppContext);

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
      stops={[AppBottomSheetHandleHeight + 96, 0.45, 1]}
      padding={{ top: 80 }}
      initialStop={0}
      backgroundStyle={{
        backgroundColor: lianeDetail ? AppColors.white : AppColors.gray100
      }}
      handlerColorStyle={{
        backgroundColor: lianeDetail ? AppColors.white : AppColors.gray100
      }}>
      {lianeDetail ? (
        <View style={{ width: "100%", height: "100%", backgroundColor: AppColors.white }}>
          {colianes?.some(coLiane => coLiane.members.some(member => member.user.id === user?.id)) ? (
            <View style={{ paddingTop: 10 }} />
          ) : (
            <View style={{ flexDirection: "row", justifyContent: "center" }}>
              <View style={{ paddingTop: 10 }}>
                <AppRoundedButton
                  color={defaultTextColor(AppColors.primaryColor)}
                  onPress={() =>
                    navigation.navigate("Publish", {
                      initialValue: lianeDetail
                    })
                  }
                  backgroundColor={AppColors.primaryColor}
                  text={"Rejoindre"}
                />
              </View>
            </View>
          )}

          <Pressable style={{ position: "absolute", top: 10, left: 10 }} onPress={() => setLianeDetail(undefined)}>
            <AppIcon name={"arrow2-left"} color={AppColors.darkGray} size={22} />
          </Pressable>

          <View>{displayResolvedLiane(lianeDetail)}</View>
        </View>
      ) : (
        <SectionList
          style={{ padding: 5 }}
          refreshControl={<RefreshControl refreshing={isFetching || false} onRefresh={() => currentBoundbox && fetchLianeOnMap(currentBoundbox)} />}
          sections={sections}
          showsVerticalScrollIndicator={false}
          renderItem={props => LianeOnMapItem({ ...props, openLiane: setLianeDetail })}
          keyExtractor={item => item.id!}
          onEndReachedThreshold={0.2}
        />
      )}
    </AppBottomSheet>
  );
};
