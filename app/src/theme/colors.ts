import { ColorValue } from "react-native";

export type AppColorSwatch = Readonly<{ [name in 500]: ColorValue }> &
  Readonly<Partial<{ [name in 100 | 200 | 300 | 400 | 600 | 700 | 800 | 900]: ColorValue }>>;

export enum AppColors {
  white = "#FFFFFF",
  black = "#000000",
  blue = "#0B79F9",
  darkBlue = "#23278A",
  yellow = "#FFB545",
  pink = "#ff8c8c",
  orange = "#e7492e"
}
export const AppColorPalettes = {
  gray: {
    100: "#F3F4F6",
    200: "#D0D0D0",
    400: "#9CA3AF",
    500: "#6B7280",

    600: "#586477",
    700: "#374151",
    800: "#2E2E2E"
  },
  blue: { 500: AppColors.blue, 400: "#75B5F7", 300: "#9FCEFF", 100: "#CEE4FE", 700: AppColors.darkBlue },
  pink: {
    500: AppColors.pink,
    100: "#FFD6D7"
  },
  yellow: {
    500: AppColors.yellow,

    100: "#FFE4C7"
  },
  orange: { 500: AppColors.orange, 100: "#FFB186", 700: "#AA2900" }
} as const;

export const WithAlpha = (color: AppColors.white | AppColors.black, alpha: number) => {
  const rgbValue = color === AppColors.white ? "255" : "0";
  return `rgba(${rgbValue} ${rgbValue} ${rgbValue} / ${alpha})`;
};

export const defaultTextColor = (color: ColorValue) => {
  switch (color) {
    case AppColors.blue:
    case AppColors.orange:
      return AppColors.white;
    default:
      return AppColorPalettes.gray[700];
  }
};

export const HouseColor: ColorValue[] = ["#C6E1FC", /* "#FFD7AA", */ "#FFBE76", "#FFAA4B", "#FF8459", "#FFADAF"];
