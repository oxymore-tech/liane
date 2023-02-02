import { I18n } from "i18n-js";
import { NativeModules, Platform } from "react-native";
import { NavigationParamList } from "./navigation";
import en from "../../assets/translations/en.json";
import fr from "../../assets/translations/fr.json";

type SupportedLanguages = "fr" | "en";

function getSystemLocale(): SupportedLanguages {
  const currentLocale =
    Platform.OS === "ios"
      ? NativeModules.SettingsManager.settings.AppleLocale || NativeModules.SettingsManager.settings.AppleLanguages[0] // iOS 13
      : NativeModules.I18nManager.localeIdentifier;
  if (!currentLocale) {
    return "fr";
  }
  return currentLocale.toLowerCase().indexOf("fr") > -1 ? "fr" : "en";
}

export const locale = getSystemLocale();

const i18n = new I18n(
  {
    en,
    fr
  },
  { locale, missingBehavior: "guess" }
);

const translate = (scope: keyof NavigationParamList, key: string, options: any = {}) => i18n.translate(`${scope}.${key}`, options);

export const scopedTranslate =
  (scope: keyof NavigationParamList) =>
  (key: string, options: any = {}) =>
    translate(scope, key, options);

// Load date formatter
const monthDayFormatter = new Intl.DateTimeFormat(locale, {
  weekday: "short",
  month: "long",
  day: "2-digit"
});

const shortMonthDayFormatter = new Intl.DateTimeFormat(locale, {
  weekday: "short",
  month: "short",
  day: "2-digit"
});

// Load time formatter
const timeFormatter = new Intl.DateTimeFormat(locale, {
  hour: "2-digit",
  minute: "2-digit"
});

export const formatMonthDay = monthDayFormatter.format;
export const formatShortMonthDay = shortMonthDayFormatter.format;
export const formatTime = (date?: number | Date | undefined) => {
  try {
    return timeFormatter.format(date);
  } catch (e) {
    return "--:--";
  }
};
