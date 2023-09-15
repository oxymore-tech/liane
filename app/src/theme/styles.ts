import { StyleSheet } from "react-native";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppDimensions } from "@/theme/dimensions";

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
  inputContainer: {
    backgroundColor: AppColors.white,
    borderRadius: 20,
    maxHeight: 40,
    minHeight: 40,
    flex: 1,

    borderWidth: 1,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  center: {
    alignItems: "center",
    justifyContent: "center"
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,

    elevation: 4
  },

  /* Test */
  title: {
    fontSize: 18,
    fontWeight: "bold"
  },
  text: {
    fontFamily: "SourceSans3",
    fontSize: 14
  }
});
