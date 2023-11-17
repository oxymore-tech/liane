import { StyleSheet } from "react-native";
import { AppColors } from "@/theme/colors";

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
    fontSize: 18
  },
  inputContainer: {
    backgroundColor: AppColors.white,
    borderRadius: 20,
    minHeight: 40,
    borderWidth: 1,
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  center: {
    alignItems: "center",
    justifyContent: "center"
  },
  noData: {
    fontSize: 16,
    fontWeight: "bold",
    color: AppColors.primaryColor,
    paddingTop: 16
  },
  errorData: {
    fontSize: 16,
    fontWeight: "bold",
    color: AppColors.primaryColor
  },
  fullHeight: {
    height: "100%"
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
  title: {
    fontSize: 16,
    fontWeight: "bold"
  },
  text: {
    fontFamily: "Source Sans 3"
  }
});
