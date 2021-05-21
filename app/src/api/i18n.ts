import i18n from "i18n-js";
import { NavigationParamList } from "@/components/Navigation";

const translate = (scope:keyof NavigationParamList, key:string, options:any = {}) => i18n.translate(`${scope}.${key}`, options);

export const scopedTranslate = (scope:keyof NavigationParamList) => (key:string, options:any = {}) => translate(scope, key, options);