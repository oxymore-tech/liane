import { I18n } from "i18n-js";
import { locale as expoLocale } from "expo-localization";
import { NavigationParamList } from "@/components/RootNavigation";
import en from "@/assets/translations/en.json";
import fr from "@/assets/translations/fr.json";

export const locale = expoLocale === "fr-FR" ? "fr" : "en";

const i18n = new I18n({
  en,
  fr
}, { locale, missingBehavior: "guess" });

const translate = (scope:keyof NavigationParamList, key:string, options:any = {}) => i18n.translate(`${scope}.${key}`, options);

export const scopedTranslate = (scope:keyof NavigationParamList) => (key:string, options:any = {}) => translate(scope, key, options);