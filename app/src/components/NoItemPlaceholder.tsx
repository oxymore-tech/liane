import { Column } from "@/components/base/AppLayout";
import { AppStyles } from "@/theme/styles";
import LoneTree from "@/assets/lone_tree.svg";
import { AppText } from "@/components/base/AppText";
import React from "react";
import { StyleSheet } from "react-native";
import { AppColorPalettes } from "@/theme/colors";

export interface NoItemPlaceholderProps {
  action: JSX.Element;
}
export const NoItemPlaceholder = ({ action }: NoItemPlaceholderProps) => {
  return (
    <Column style={[AppStyles.center]} spacing={16}>
      <LoneTree height={"40%"} opacity={0.9} />
      <AppText style={styles.text}>Aucun résultat</AppText>
      {action}
    </Column>
  );
};

const styles = StyleSheet.create({
  text: {
    color: AppColorPalettes.gray[500],
    fontSize: 20,
    textAlignVertical: "center"
  }
});
