import { StyleSheet } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";

const AppBorderRadius = {
  input: 24
};
export const AppStyles = StyleSheet.create({
  inputBar: {
    height: 2 * AppBorderRadius.input,
    paddingVertical: 8,
    backgroundColor: AppColors.white,
    alignContent: "center",
    alignItems: "center",
    borderRadius: AppBorderRadius.input,
    paddingLeft: 12,
    paddingRight: 12
  },
  input: {
    fontSize: 18,
    color: AppColorPalettes.gray[800]
  },
  center: {
    alignItems: "center",
    justifyContent: "center"
  }
});
