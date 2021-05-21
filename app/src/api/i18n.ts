import i18n from "i18n-js";
import { NavigationParamList } from "@/components/Navigation";

const scopedTranslate = (scope:keyof NavigationParamList, key:string, options:any = {}) => i18n.translate(`${scope}.${key}`, options);

export const translate = (scope:keyof NavigationParamList) => (key:string, options:any = {}) => scopedTranslate(scope, key, options);