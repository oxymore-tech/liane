import { CoLiane } from "@liane/common";
import { AppColorPalettes } from "@/theme/colors.ts";
import { LianeOnMapItem } from "@/screens/home/LianeOnMapItemView.tsx";
import React, { useCallback, useContext, useMemo } from "react";
import { useAppNavigation } from "@/components/context/routing.ts";
import { AppText } from "@/components/base/AppText.tsx";
import { AppContext } from "@/components/context/ContextProvider.tsx";
import { Column } from "@/components/base/AppLayout.tsx";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { ActivityIndicator } from "react-native";
import { AppBottomSheet } from "@/components/base/AppBottomSheet.tsx";

type HomeMapBottomSheetProps = {
  lianes?: CoLiane[];
  onBottomPaddingChange?: (padding: number) => void;
  isFetching?: boolean;
};

export const HomeMapBottomSheetContainer = ({ lianes = [], onBottomPaddingChange, isFetching }: HomeMapBottomSheetProps) => {
  const { navigation } = useAppNavigation<"Home">();
  const { user } = useContext(AppContext);

  const openLiane = useCallback(
    (liane: CoLiane) => {
      const me = liane.members.find(m => m.user.id === user?.id);
      if (me) {
        navigation.navigate("CommunitiesChat", { liane: liane.id! });
      } else {
        navigation.navigate("LianeMapDetail", { liane });
      }
    },
    [navigation, user]
  );

  const bottomSheetIndex = useMemo(() => {
    return lianes.length === 0 ? 0 : 1;
  }, [lianes]);

  return (
    <AppBottomSheet snapPoints={[60, "50%", "100%"]} index={bottomSheetIndex} onChange={onBottomPaddingChange}>
      <Column style={{ backgroundColor: AppColorPalettes.gray[700] }}>
        {isFetching ? (
          <ActivityIndicator color={AppColorPalettes.gray[100]} />
        ) : (
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
        )}
        <BottomSheetFlatList
          style={{ marginHorizontal: 8 }}
          showsVerticalScrollIndicator={false}
          data={lianes}
          renderItem={props => <LianeOnMapItem {...props} openLiane={openLiane} />}
          keyExtractor={item => item.id!}
          contentContainerStyle={{ minHeight: "100%", marginBottom: 100, paddingBottom: 100 }}
        />
      </Column>
    </AppBottomSheet>
  );
};
