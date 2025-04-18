import { ColorValue } from "react-native";

export enum AppColors {
  primaryColor = "#F25757",
  secondaryColor = "#3C88A6",
  backgroundColor = "#FFFFFF",
  fontColor = "#2E2E2E",
  grayBackground = "#E5E5E5",
  lightGrayBackground = "#EBE9E9",
  darkGray = "#2B2F35",
  gray100 = "#F3F4F6",

  white = "#FFFFFF",
  black = "#000000",
  blue = "#0B79F9",
  darkBlue = "#23278A",
  yellow = "#FFB545",
  orange = "#e7492e"
}
export const AppColorPalettes = {
  gray: {
    100: "#F3F4F6",
    150: "#EBE9E9",
    200: "#D0D0D0",
    300: "#b2b2b2",
    400: "#9CA3AF",
    500: "#6B7280",

    600: "#586477",
    700: "#374151",
    800: "#2E2E2E"
  },
  blue: { 500: AppColors.blue, 400: "#75B5F7", 300: "#9FCEFF", 100: "#CEE4FE", 700: AppColors.darkBlue, 800: "#134558", 900: "#030636" },
  pink: {
    500: "#ff8c8c",
    400: "#F49496",
    600: "#E7696C",
    100: "#FFD6D7"
  },
  yellow: {
    500: AppColors.yellow,
    800: "#d28127",
    700: "#F39F41",
    200: "#FFD19E",
    100: "#FFE4C7"
  },
  orange: { 700: "#e43f3f", 500: AppColors.primaryColor, 600: "#E34526", 400: "#EF6E55", 100: "#ffedd5" },
  green: { 700: "#22a83f", 500: "#00ce2d", 400: "#A3E4B0", 300: "#B9E7C3", 200: "#D1F2E6", 100: "#E8F8F5" }
} as const;

export const WithAlpha = (color: AppColors.white | AppColors.black, alpha: number) => {
  const rgbValue = color === AppColors.white ? "255" : "0";
  return `rgba(${rgbValue} ${rgbValue} ${rgbValue} / ${alpha})`;
};

export const defaultTextColor = (color: ColorValue) => {
  switch (color) {
    case AppColors.blue:
    case AppColors.primaryColor:
    case AppColors.darkBlue:
      return AppColors.white;
    default:
      return AppColorPalettes.gray[700];
  }
};

export const ContextualColors = {
  orangeWarn: {
    light: "#FFBC8B"
  },
  greenValid: {
    light: "#B9E7C3",
    accent: "#00ce2d"
  },
  redAlert: {
    light: "#ffd7d0",
    bg: "#ab2f23",
    text: "#750000"
  }
} as const;
