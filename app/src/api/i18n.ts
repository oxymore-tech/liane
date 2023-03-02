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

const dateFormatter = new Intl.DateTimeFormat(locale, {
  month: "2-digit",
  day: "2-digit",
  year: "2-digit"
});

// Load time formatter
const timeFormatter = new Intl.DateTimeFormat(locale, {
  hour: "2-digit",
  minute: "2-digit"
});

export const toRelativeTimeString = (timestamp: Date) => {
  let time, date;
  /*  const delta = (new Date().getTime() - timestamp.getTime()) / 1000;
  const minutes = Math.floor(delta / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days <= 1) {
    date = chatDatetimeFormatter.format(-days, "day");
  } else {
    date = dateFormatter.format(timestamp);
  }

  if (hours > 0) {
    time = timeFormatter.format(timestamp);
  } else if (minutes > 0) {
    time = chatDatetimeFormatter.format(-minutes, "minute");
  } else {
    time = chatDatetimeFormatter.format(-delta, "second");
  }*/

  date = dateFormatter.format(timestamp);
  time = timeFormatter.format(timestamp);
  return date + ", " + time;
};

// TODO https://formatjs.io/docs/polyfills/intl-relativetimeformat
/*const chatDatetimeFormatter = new Intl.RelativeTimeFormat(locale, {
  localeMatcher: "best fit",
  numeric: "auto"
});*/

export const formatMonthDay = monthDayFormatter.format;
export const formatShortMonthDay = shortMonthDayFormatter.format;
export const formatTime = (date?: number | Date | undefined) => {
  try {
    return timeFormatter.format(date);
  } catch (e) {
    return "--:--";
  }
};

export const formatDateTime = (date: Date) => {
  return `${formatMonthDay(date)} à ${formatTime(date)}`;
};
