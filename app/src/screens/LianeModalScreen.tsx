import React, { useCallback, useMemo, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { BottomSheetBackdropProps, BottomSheetModal } from "@gorhom/bottom-sheet";

import Animated, { useAnimatedStyle, interpolate, Extrapolate } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors } from "@/theme/colors";
import LianeIcon from "@/assets/icon.svg";
import { LianeHouseVector } from "@/components/LianeHouseVector";

export const LianeModalScreen = () => {

  const renderLianeBackdrop = ({ animatedIndex, style }: BottomSheetBackdropProps) => {
    // TODO translate LianeHouseVector
    const containerAnimatedStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        animatedIndex.value,
        [-1, -1, 0],
        [0, 0, 1],
        Extrapolate.CLAMP
      )

    }));
    // styles
    const containerStyle = useMemo(
      () => [
        style,
        {
          backgroundColor: AppColors.white
        },
        containerAnimatedStyle
      ],
      [style, containerAnimatedStyle]
    );

    const insets = useSafeAreaInsets();

    return (
      <Animated.View style={[containerStyle, { marginTop: insets.top }]}>
        <LianeHouseVector />
      </Animated.View>
    );
  };

  // ref
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const openModal = () => {
    bottomSheetRef.current?.present();
  };

  // variables
  const snapPoints = useMemo(() => ["75%"], []);

  return (
    <>

      <Pressable style={styles.iconContainer} onPress={() => openModal()}>
        <LianeIcon width={40} height={40} color={AppColors.blue700} />
      </Pressable>

      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.modalBackground}
        backdropComponent={renderLianeBackdrop}
      >
        <View />
      </BottomSheetModal>
    </>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16
  },
  modalBackground: {
    backgroundColor: AppColors.blue700
  }
});
