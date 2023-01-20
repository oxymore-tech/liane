import { I18n } from "i18n-js";
import { NativeModules, Platform } from "react-native";
import { NavigationParamList } from "./navigation";
import en from "../../assets/translations/en.json";
import fr from "../../assets/translations/fr.json";

const systemLocale = Platform.OS === "ios"
  ? NativeModules.SettingsManager.settings.AppleLocale
    || NativeModules.SettingsManager.settings.AppleLanguages[0] // iOS 13
  : NativeModules.I18nManager.localeIdentifier;

export const locale = systemLocale === "fr-FR" ? "fr" : "en";

const i18n = new I18n({
  en,
  fr
}, { locale, missingBehavior: "guess" });

const translate = (scope: keyof NavigationParamList, key: string, options: any = {}) => i18n.translate(`${scope}.${key}`, options);

export const scopedTranslate = (scope: keyof NavigationParamList) => (key: string, options: any = {}) => translate(scope, key, options);

// Load date formatter
const monthDayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short",
  month: "long",
  day: "2-digit" });

// Load time formatter
const timeFormatter = new Intl.DateTimeFormat(locale, { weekday: "short",
  hour: "2-digit",
  minute: "2-digit" });

export const formatMonthDay = monthDayFormatter.format;
export const formatTime = timeFormatter.format;
