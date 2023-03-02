import { AppColorPalettes, AppColors, ContextualColors } from "@/theme/colors";
import { Pressable, StyleSheet, View } from "react-native";
import React from "react";
import { Row } from "@/components/base/AppLayout";

export interface TripCardProps {
  header: JSX.Element;

  content: JSX.Element;

  border?: boolean;
}

export const TripCard = ({ header, content, border = false }: TripCardProps) => {
  const borderStyle = border ? styles.grayBorder : { borderWidth: 0, borderLeftWidth: 0, borderRightWidth: 0, borderBottomWidth: 0 };
  return (
    <View>
      <Row style={[styles.header, borderStyle, { backgroundColor: AppColorPalettes.yellow[500] }]}>{header}</Row>
      <View style={[styles.item, styles.itemLast, borderStyle]}>{content}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerText: {
    color: AppColors.white,
    fontSize: 16,
    textAlignVertical: "center"
  },
  infoContainer: {
    padding: 8,
    justifyContent: "space-between",
    alignItems: "center"
  },
  infoText: {
    fontSize: 16
  },
  headerContainer: {
    backgroundColor: AppColors.darkBlue,
    paddingVertical: 12
  },

  container: {
    marginHorizontal: 16,
    height: "100%"
  },
  grayBorder: {
    borderColor: AppColorPalettes.gray[200]
  },
  exactMatchBg: {
    backgroundColor: ContextualColors.greenValid.bg
  },
  compatibleMatchBg: {
    backgroundColor: ContextualColors.orangeWarn.bg
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
    borderWidth: 1
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  item: {
    padding: 16,
    backgroundColor: AppColors.white,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1
  },
  itemLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16
  }
});
