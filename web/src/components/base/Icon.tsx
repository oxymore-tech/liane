import * as React from "react";
import {
  LuAlertTriangle,
  LuCloudOff,
  LuFilter,
  LuHome,
  LuInfo,
  LuMails,
  LuMap,
  LuMapPin,
  LuRefreshCw,
  LuRotateCcw,
  LuSearch,
  LuShieldCheck,
  LuTable2,
  LuX
} from "react-icons/lu";
import { IconContext } from "react-icons";

export type IconProps = {
  name: IconName;
} & IconContext;

export type IconName =
  | "close"
  | "home"
  | "shield-check"
  | "search"
  | "refresh"
  | "retry"
  | "filter"
  | "pin"
  | "map"
  | "info"
  | "offline"
  | "alert"
  | "table"
  | "mails";

export function getIconComponent(name: IconName) {
  switch (name) {
    case "home":
      return LuHome;
    case "close":
      return LuX;
    case "shield-check":
      return LuShieldCheck;
    case "search":
      return LuSearch;
    case "refresh":
      return LuRefreshCw;
    case "retry":
      return LuRotateCcw;
    case "filter":
      return LuFilter;
    case "pin":
      return LuMapPin;
    case "map":
      return LuMap;
    case "info":
      return LuInfo;
    case "offline":
      return LuCloudOff;
    case "alert":
      return LuAlertTriangle;
    case "mails":
      return LuMails;
    case "table":
      return LuTable2;
    default:
      console.warn("Unknown icon", name);
      return null;
  }
}
export function Icon({ name, ...props }: IconProps) {
  const Component = getIconComponent(name);
  if (Component) return <Component {...props} />;
  return null;
}
