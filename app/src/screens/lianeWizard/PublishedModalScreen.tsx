import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import { AppColors, defaultTextColor, WithAlpha } from "@/theme/colors";
import { AppDimensions } from "@/theme/dimensions";
import React from "react";

export const PublishedModalScreen = ({ navigation }) => {
  return (
    <Pressable onPress={() => navigation.goBack()}>
      <View
        style={{
          backgroundColor: WithAlpha(AppColors.black, 0.45),
          width: "100%",
          height: "100%",
          padding: 32,
          justifyContent: "center",
          alignItems: "center"
        }}>
        <Pressable onPress={() => {}}>
          <View
            style={{
              backgroundColor: AppColors.yellow,
              borderRadius: 16,
              padding: 16
            }}>
            <AppText numberOfLines={1} style={styles.title}>
              Votre Liane est publiée !
            </AppText>
            <View style={{ height: 80 }} />
          </View>
        </Pressable>
      </View>
    </Pressable>
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

  title: {
    fontSize: 24,
    color: defaultTextColor(AppColors.yellow),
    padding: 8,
    fontWeight: "500"
  }
});
