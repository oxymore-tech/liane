import { I18n } from "i18n-js";
import { NavigationParamList } from "@/components/context/routing";
import en from "../../assets/translations/en.json";
import fr from "../../assets/translations/fr.json";
import { Localization } from "@liane/common";

type SupportedLanguages = "fr" | "en";

function getSystemLocale(): SupportedLanguages {
    return "fr";
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

export const AppLocalization = new Localization();
