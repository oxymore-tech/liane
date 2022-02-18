import i18n from "i18n-js";
import { NavigationParamList } from "@/components/Navigation";
import { locale as expoLocale } from "expo-localization";

const translate = (scope:keyof NavigationParamList, key:string, options:any = {}) => i18n.translate(`${scope}.${key}`, options);

export const locale = expoLocale === "fr-FR" ? "fr" : "en";

export const scopedTranslate = (scope:keyof NavigationParamList) => (key:string, options:any = {}) => translate(scope, key, options);