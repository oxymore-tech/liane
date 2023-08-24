import React from "react";
import { Icon } from "react-native-eva-icons";
import { ColorValue, StyleProp, ViewStyle } from "react-native";

import CarQuestionMark from "@/assets/icons/car_question_mark.svg";
import CarCheckMark from "@/assets/icons/car_check_mark.svg";
import CarStrikeThrough from "@/assets/icons/car_strike_through.svg";
import MessageCircleFull from "@/assets/icons/message-circle-full.svg";
import Car from "@/assets/icons/car.svg";
import TwistingArrow from "@/assets/icons/twisting_arrow.svg";
import DirectionsWalk from "@/assets/icons/directions_walk.svg";
import History from "@/assets/icons/history.svg";
import PositionOn from "@/assets/icons/position-on.svg";
import PositionOff from "@/assets/icons/position-off.svg";
import RallyingPoint from "@/assets/icons/liane_rallying_point.svg";
import Seat from "@/assets/icons/seat.svg";

import { AppDimensions } from "@/theme/dimensions";
import { AppColorPalettes } from "@/theme/colors";

export type IconName = `${(typeof EvaIconsNames)[number]}-outline` | (typeof EvaIconsNames)[number] | CustomIconName;

export type AppIconProps = {
  name: IconName;
  color?: ColorValue;
  size?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
};

export function AppIcon({ name, color = AppColorPalettes.gray[800], size = AppDimensions.iconSize, opacity = 1, style }: AppIconProps) {
  const props = { color, width: size, height: size, style };
  switch (name) {
    case "car-check-mark":
      return <CarCheckMark {...props} />;
    case "car-question-mark":
      return <CarQuestionMark {...props} />;
    case "car-strike-through":
      return <CarStrikeThrough {...props} />;
    case "message-circle-full":
      return <MessageCircleFull {...props} />;
    case "twisting-arrow":
      return <TwistingArrow {...props} />;
    case "car":
      return <Car {...props} />;
    case "history":
      return <History {...props} />;
    case "position-on":
      return <PositionOn {...props} />;
    case "position-off":
      return <PositionOff {...props} />;
    case "directions-walk":
      return <DirectionsWalk {...props} />;
    case "rallying-point":
      return <RallyingPoint {...props} />;
    case "seat":
      return <Seat {...props} />;
    default:
      return <Icon opacity={opacity} name={name} width={size} height={size} fill={color} />;
  }
}

type CustomIconName = (typeof AppIconsNames)[number];

const AppIconsNames = [
  "car-check-mark",
  "car-question-mark",
  "car-strike-through",
  "message-circle-full",
  "car",
  "history",
  "position-on",
  "position-off",
  "twisting-arrow",
  "directions-walk",
  "rallying-point",
  "seat"
] as const;

const EvaIconsNames = [
  "activity",
  "alert-circle",
  "alert-triangle",
  "archive",
  "arrow-back",
  "arrow-circle-down",
  "arrow-circle-left",
  "arrow-circle-right",
  "arrow-circle-up",
  "arrow-down",
  "arrow-downward",
  "arrow-forward",
  "arrow-ios-back",
  "arrow-ios-downward",
  "arrow-ios-forward",
  "arrow-ios-upward",
  "arrow-left",
  "arrow-right",
  "arrow-up",
  "arrow-upward",
  "arrowhead-down",
  "arrowhead-left",
  "arrowhead-right",
  "arrowhead-up",
  "at",
  "attach-2",
  "attach",
  "award",
  "backspace",
  "bar-chart-2",
  "bar-chart",
  "battery",
  "behance",
  "bell-off",
  "bell",
  "bluetooth",
  "book-open",
  "book",
  "bookmark",
  "briefcase",
  "browser",
  "brush",
  "bulb",
  "calendar",
  "camera",
  "car",
  "cast",
  "charging",
  "checkmark-circle-2",
  "checkmark-circle",
  "checkmark",
  "checkmark-square-2",
  "checkmark-square",
  "chevron-down",
  "chevron-left",
  "chevron-right",
  "chevron-up",
  "clipboard",
  "clock",
  "close-circle",
  "close",
  "close-square",
  "cloud-download",
  "cloud-upload",
  "code-download",
  "code",
  "collapse",
  "color-palette",
  "color-picker",
  "compass",
  "copy",
  "corner-down-left",
  "corner-down-right",
  "corner-left-down",
  "corner-left-up",
  "corner-right-down",
  "corner-right-up",
  "corner-up-left",
  "corner-up-right",
  "credit-card",
  "crop",
  "cube",
  "diagonal-arrow-left-down",
  "diagonal-arrow-left-up",
  "diagonal-arrow-right-down",
  "diagonal-arrow-right-up",
  "done-all",
  "download",
  "droplet-off",
  "droplet",
  "edit-2",
  "edit",
  "email",
  "expand",
  "external-link",
  "eye-off-2",
  "eye-off",
  "eye",
  "facebook",
  "file-add",
  "file",
  "file-remove",
  "file-text",
  "film",
  "flag",
  "flash-off",
  "flash",
  "flip-2",
  "flip",
  "folder-add",
  "folder",
  "folder-remove",
  "funnel",
  "gift",
  "github",
  "globe-2",
  "globe",
  "google",
  "grid",
  "hard-drive",
  "hash",
  "headphones",
  "heart",
  "home",
  "image",
  "inbox",
  "info",
  "keypad",
  "layers",
  "layout",
  "link-2",
  "link",
  "linkedin",
  "list",
  "loader",
  "lock",
  "log-in",
  "log-out",
  "map",
  "maximize",
  "menu-2",
  "menu-arrow",
  "menu",
  "message-circle",
  "message-square",
  "mic-off",
  "mic",
  "minimize",
  "minus-circle",
  "minus",
  "minus-square",
  "monitor",
  "moon",
  "more-horizontal",
  "more-vertical",
  "move",
  "music",
  "navigation-2",
  "navigation",
  "npm",
  "options-2",
  "options",
  "pantone",
  "paper-plane",
  "pause-circle",
  "people",
  "percent",
  "person-add",
  "person-delete",
  "person-done",
  "person",
  "person-remove",
  "phone-call",
  "phone-missed",
  "phone-off",
  "phone",
  "pie-chart",
  "pin",
  "play-circle",
  "plus-circle",
  "plus",
  "plus-square",
  "power",
  "pricetags",
  "printer",
  "question-mark-circle",
  "question-mark",
  "radio-button-off",
  "radio-button-on",
  "radio",
  "recording",
  "refresh",
  "repeat",
  "rewind-left",
  "rewind-right",
  "save",
  "scissors",
  "search",
  "settings-2",
  "settings",
  "shake",
  "share",
  "shield-off",
  "shield",
  "shopping-bag",
  "shopping-cart",
  "shuffle-2",
  "shuffle",
  "skip-back",
  "skip-forward",
  "slash",
  "smartphone",
  "smiling-face",
  "speaker",
  "square",
  "star",
  "stop-circle",
  "sun",
  "swap",
  "sync",
  "text",
  "thermometer-minus",
  "thermometer",
  "thermometer-plus",
  "toggle-left",
  "toggle-right",
  "trash-2",
  "trash",
  "trending-down",
  "trending-up",
  "tv",
  "twitter",
  "umbrella",
  "undo",
  "unlock",
  "upload",
  "video-off",
  "video",
  "volume-down",
  "volume-mute",
  "volume-off",
  "volume-up",
  "wifi-off",
  "wifi"
] as const;
