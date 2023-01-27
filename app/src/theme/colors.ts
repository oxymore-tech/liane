import {ColorValue} from "react-native";

export enum AppColors {
  white = "#FFFFFF",
  black = "#000000",
  gray100 = "#F3F4F6",
  gray200 = "#D0D0D0",
  gray400 = "#9CA3AF",
  gray500 = "#6B7280",

  gray600 = "#586477",
  gray700 = "#374151",
  gray800 = "#2E2E2E",
  blue500 = "#0B79F9",
  blue300 = "#CEE4FE",
  blue700 = "#23278A",
  orange500 = "#e7492e", // "#EA6D2E",
  orange100 = "#FFBBA4",
  yellow500 = "#FFB545",

  yellow100 = "#FFE4C7",
  pink500 = "#ff8c8c",

  pink100 = "#FFD6D7",

  blue400 = "#75B5F7",
  // pink600 = "#FF5C5C",
  //  orange600 = "#FF5C22"
}

export const defaultTextColor = (color: AppColors) => {
  switch (color) {
    case AppColors.blue500:
    case AppColors.orange500:
      return AppColors.white;
    default:
      return AppColors.gray700;
  }
};

export const HouseColor: ColorValue[] = [
  "#C6E1FC",
  /* "#FFD7AA", */ "#FFBE76",
  "#FFAA4B",
  "#FF8459",
  "#FFADAF",
];

export const AppTheme = {
  primary: AppColors.blue700,
  secondary: AppColors.blue500,
  accent: AppColors.orange500,
  defaultTextColor: AppColors.gray800,
  buttonTextColor: AppColors.white,
};
