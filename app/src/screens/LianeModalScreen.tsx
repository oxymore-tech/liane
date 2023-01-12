import React, { useMemo, useRef, useState } from "react";
import {
  BackHandler, Pressable, StyleSheet, useWindowDimensions, View
} from "react-native";
import { ScrollView } from "react-native-gesture-handler";

import { BottomSheetBackdropProps, BottomSheetModal } from "@gorhom/bottom-sheet";

import Animated, { Extrapolate, interpolate, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppColors } from "@/theme/colors";
import { LianeHouseVector } from "@/components/LianeHouseVector";
import { AppText } from "@/components/base/AppText";
import { AppDimensions } from "@/theme/dimensions";
import { CardButton } from "@/components/CardButton";
import { Column, Row } from "@/components/base/AppLayout";
import { AppIcon } from "@/components/base/AppIcon";
import { AppButton } from "@/components/base/AppButton";

const horizontalCardSpacing = 12;
const verticalCardSpacing = 8;

const ReturnTrip = () => {

  const [returnTrip, setReturnTrip] = useState(undefined);
  return (
    <Row style={styles.singleCardRow}>

      {returnTrip
        ? (<CardButton label="Départ à" value="16:00" color={AppColors.blue500} onCancel={() => setReturnTrip(undefined)} />)
        : (<AppButton icon="plus-outline" color={AppColors.blue500} onPress={() => setReturnTrip(true)} />)}
    </Row>
  );

};

const ShareList = ({ onItemAdded }) => {
  const [shareList, setShareList] = useState<string[]>([]);
  const removeItem = (index: number) => {
    shareList.splice(index, 1);
    setShareList([...shareList]);
  };

  const addContact = () => {
    setShareList([...shareList, `Contact ${shareList.length}`]);
    onItemAdded();
  };

  return (

    <Column
      spacing={8}
      style={{ alignItems: "flex-start" }}
    >
      {shareList.map((v, i) => (
        <CardButton value={v} key={i} onCancel={() => removeItem(i)} color={AppColors.blue500} />
      ))}
      <AppButton icon="plus-outline" color={AppColors.blue500} onPress={addContact} />

    </Column>

  );
};
export const LianeModalScreen = () => {

  // variables
  const snapPoints = useMemo(() => ["75%"], []);
  const insets = useSafeAreaInsets();

  // Refs
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Callbacks
  const openModal = () => {
    bottomSheetRef.current?.present();
  };

  const closeModal = () => {
    bottomSheetRef.current?.close();
  };

  const backHandler = BackHandler.addEventListener(
    "hardwareBackPress",
    () => {
      closeModal();
      backHandler.remove();
      return true;
    }
  );

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
    const { height, width } = useWindowDimensions();
    return (
      <Animated.View style={[containerStyle, { paddingTop: insets.top + 1, alignItems: "flex-end", paddingRight: 24 }]}>
        <Pressable style={{ position: "absolute", top: 16 + insets.top, left: 16 }} onPress={closeModal}>
          <AppIcon name="close-outline" size={32} />
        </Pressable>
        <LianeHouseVector maxHeight={height * 0.25 - insets.top} maxWidth={width * 0.65} />
      </Animated.View>
    );
  };

  return (
    <>

      <AppButton icon="plus-outline" title="Nouvelle Liane" onPress={() => openModal()} />

      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        handleComponent={null}
        backgroundStyle={styles.modalBackground}
        backdropComponent={renderLianeBackdrop}
        enablePanDownToClose={false}
      >
        <View style={[styles.contentContainer, { marginBottom: insets.bottom + 40 }]}>
          <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
            <AppText style={styles.title}>
              Lancer une liane
            </AppText>
            <Pressable style={{ alignSelf: "center", paddingTop: 8, paddingHorizontal: 8 }} onPress={closeModal}>
              <AppButton icon="arrow-right" color={AppColors.white} kind="circular" foregroundColor={AppColors.orange500} />
            </Pressable>
          </Row>
          <ScrollView
            ref={scrollViewRef}
            style={{ marginTop: 12 }}
            overScrollMode="never"
            fadingEdgeLength={24}
          >
            <View style={styles.mainSectionContainer}>
              <Column spacing={verticalCardSpacing}>
                <Row spacing={horizontalCardSpacing}>
                  <CardButton label="Départ de" value="Luchon" color={AppColors.orange500} />
                  <CardButton label="Arrivée à" value="Toulouse" color={AppColors.pink500} />
                </Row>
                <Row spacing={horizontalCardSpacing}>
                  <CardButton label="Date" value="Demain" color={AppColors.yellow500} />
                  <CardButton label="Départ à" value="12:00" color={AppColors.blue500} />
                </Row>
                <Row style={styles.singleCardRow}>
                  <CardButton label="Véhicule" value="Oui" color={AppColors.white} />
                </Row>
              </Column>
            </View>

            <Row spacing={horizontalCardSpacing}>
              <AppIcon name="swap-outline" color={AppColors.white} />
              <AppText style={styles.sectionTitle}>
                Ajouter un retour
              </AppText>
            </Row>
            <View style={styles.smallSectionContainer}>
              <ReturnTrip />
            </View>

            <Row spacing={horizontalCardSpacing} style={{ alignItems: "center" }}>
              <AppIcon name="share-outline" color={AppColors.white} />
              <AppText style={styles.sectionTitle}>
                Partager avec
              </AppText>
            </Row>
            <View style={styles.smallSectionContainer}>
              <ShareList onItemAdded={() => setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }))} />
            </View>

          </ScrollView>

        </View>

      </BottomSheetModal>

    </>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    display: "flex",
    flex: 1,
    height: "100%",
    paddingHorizontal: AppDimensions.bottomBar.itemSpacing
  },
  modalBackground: {
    backgroundColor: AppColors.blue700
  },
  title: {
    fontSize: AppDimensions.textSize.big,
    color: AppColors.white,
    paddingTop: 8,
    paddingHorizontal: 8
  },
  sectionTitle: {
    fontSize: AppDimensions.textSize.medium,
    fontWeight: "500",
    color: AppColors.white
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  mainSectionContainer: {
    paddingVertical: 16
  },
  smallSectionContainer: {
    marginBottom: 12,
    paddingVertical: 12
  },
  singleCardRow: {
    width: "50%",
    paddingRight: horizontalCardSpacing / 2
  }

});
