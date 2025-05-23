import React from "react";

import { Pressable, StyleSheet, View } from "react-native";
import { CoLiane } from "@liane/common";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { extractDaysOnly, extractWaypointFromTo } from "@/util/hooks/lianeRequest";
import { AppIcon } from "@/components/base/AppIcon.tsx";
import { JoinedLianeView } from "@/components/communities/JoinedLianeView.tsx";

type LianeOnMapItemProps = {
  item: CoLiane;
  openLiane: (liane: CoLiane) => void;
};

export const LianeOnMapItem = ({ item, openLiane }: LianeOnMapItemProps) => {
  if (item) {
    const { to, from } = extractWaypointFromTo(item?.wayPoints);
    return (
      <Pressable style={{ justifyContent: "center", display: "flex" }} onPress={() => openLiane(item)}>
        <View
          style={{
            backgroundColor: AppColors.backgroundColor,
            paddingLeft: 8,
            flex: 1,
            marginTop: 10,
            borderRadius: 8
          }}>
          <View style={{ paddingTop: 10, flexDirection: "row", justifyContent: "flex-start", paddingRight: 32 }}>
            <AppText style={styles.city}>{from?.city}</AppText>
            <AppText style={styles.label}>{from?.label}</AppText>
          </View>
          <View style={{ paddingBottom: 5, flexDirection: "row", justifyContent: "flex-start" }}>
            <AppText style={styles.city}>{to?.city}</AppText>
            <AppText style={styles.label}>{to?.label}</AppText>
          </View>
          <View style={{ paddingBottom: 10, flexDirection: "row", justifyContent: "flex-start" }}>
            <AppText style={styles.days}>{extractDaysOnly(item)}</AppText>
          </View>
          <View style={{ position: "absolute", top: 10, right: 10 }}>
            <AppIcon name="arrow-right" color={AppColors.darkGray} size={22} />
          </View>
          <View style={{ position: "absolute", bottom: 10, right: 10 }}>
            <JoinedLianeView liane={item} />
          </View>
        </View>
      </Pressable>
    );
  }

  return <View />;
};

const styles = StyleSheet.create({
  city: {
    fontSize: 18,
    fontWeight: "bold",
    flexShrink: 1,
    lineHeight: 27,
    paddingRight: 8,
    color: AppColors.black
  },
  label: {
    fontSize: 16,
    fontWeight: "normal",
    flexShrink: 1,
    lineHeight: 27,
    color: AppColorPalettes.gray[500]
  },
  days: {
    fontSize: 15,
    fontWeight: "normal",
    flexShrink: 1,
    lineHeight: 20,
    color: AppColors.darkGray
  }
});
