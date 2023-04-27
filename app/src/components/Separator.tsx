import { StyleSheet, View, ViewProps } from "react-native";
import { AppColorPalettes } from "@/theme/colors";
import React from "react";

export const LineSeparator = (props: ViewProps) => <View {...props} style={[styles.separatorLine, props.style]} />;
export const SectionSeparator = (props: ViewProps) => <View {...props} style={[styles.wideSeparator, props.style]} />;

const styles = StyleSheet.create({
  separatorLine: {
    marginHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: AppColorPalettes.gray[200],
    marginVertical: 4
  },
  wideSeparator: {
    borderBottomWidth: 8,
    width: "100%",
    opacity: 0.4,
    borderBottomColor: AppColorPalettes.gray[200],
    marginVertical: 4
  }
});
