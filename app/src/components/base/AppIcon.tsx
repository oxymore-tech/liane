import React from "react";
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
import PositionMarker from "@/assets/icons/position-marker.svg";

import RallyingPoint from "@/assets/icons/liane_rallying_point.svg";
import Seat from "@/assets/icons/seat.svg";
import ArrowSwitch from "@/assets/icons/arrow-switch.svg";
import ArrowRight from "@/assets/icons/eva--arrow-ios-forward-fill.svg";
import ArrowLeft from "@/assets/icons/arrow-left.svg";
import Trash from "@/assets/icons/trash.svg";
import Info from "@/assets/icons/info.svg";
import Book from "@/assets/icons/book-fill.svg";
import Cloud from "@/assets/icons/cloud.svg";
import ThumbUp from "@/assets/icons/thumb_up.svg";
import ThumbDown from "@/assets/icons/thumb_down.svg";
import Liane from "@/assets/icons/liane.svg";
import Bulb from "@/assets/icons/bulb.svg";
import Search from "@/assets/icons/search.svg";
import Close from "@/assets/icons/close.svg";
import Send from "@/assets/icons/send.svg";
import Refresh from "@/assets/icons/refresh.svg";
import Flag from "@/assets/icons/flag.svg";
import Pin from "@/assets/icons/pin.svg";
import People from "@/assets/icons/people.svg";
import Edit from "@/assets/icons/edit.svg";
import Plus from "@/assets/icons/plus.svg";
import Map from "@/assets/icons/map.svg";
import Calendar from "@/assets/icons/calendar.svg";
import Minus from "@/assets/icons/minus.svg";
import Person from "@/assets/icons/person.svg";
import WifiOff from "@/assets/icons/wifi-off.svg";
import Swap from "@/assets/icons/swap.svg";
import Logout from "@/assets/icons/log-out.svg";
import MoreVertical from "@/assets/icons/more-vertical.svg";
import ArrowUp from "@/assets/icons/arrow-up.svg";
import ArrowDown from "@/assets/icons/arrow-down.svg";
import CloseCircle from "@/assets/icons/close-circle.svg";
import Checkmark from "@/assets/icons/checkmark.svg";
import Settings from "@/assets/icons/settings.svg";
import Message from "@/assets/icons/message.svg";
import Protect from "@/assets/icons/protect.svg";

import { AppDimensions } from "@/theme/dimensions";
import { AppColorPalettes } from "@/theme/colors";

export type AppIconProps = {
  name: IconName;
  color?: ColorValue;
  size?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
};

export function AppIcon({ name, color = AppColorPalettes.gray[800], size = AppDimensions.iconSize, style }: AppIconProps) {
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
    case "arrow-switch":
      return <ArrowSwitch {...props} />;
    case "arrow-right":
      return <ArrowRight {...props} />;
    case "arrow-left":
      return <ArrowLeft {...props} />;
    case "trash":
      return <Trash {...props} />;
    case "info":
      return <Info {...props} />;
    case "book":
      return <Book {...props} />;
    case "cloud":
      return <Cloud {...props} />;
    case "thumb-up":
      return <ThumbUp {...props} />;
    case "thumb-down":
      return <ThumbDown {...props} />;
    case "position-marker":
      return <PositionMarker {...props} />;
    case "liane":
      return <Liane {...props} />;
    case "bulb":
      return <Bulb {...props} />;
    case "close":
      return <Close {...props} />;
    case "send":
      return <Send {...props} />;
    case "refresh":
      return <Refresh {...props} />;
    case "flag":
      return <Flag {...props} />;
    case "pin":
      return <Pin {...props} />;
    case "people":
      return <People {...props} />;
    case "close-circle":
      return <CloseCircle {...props} />;
    case "checkmark":
      return <Checkmark {...props} />;
    case "more-vertical":
      return <MoreVertical {...props} />;
    case "arrow-up":
      return <ArrowUp {...props} />;
    case "arrow-down":
      return <ArrowDown {...props} />;
    case "plus":
      return <Plus {...props} />;
    case "edit":
      return <Edit {...props} />;
    case "map":
      return <Map {...props} />;
    case "calendar":
      return <Calendar {...props} />;
    case "minus":
      return <Minus {...props} />;
    case "person":
      return <Person {...props} />;
    case "wifi-off":
      return <WifiOff {...props} />;
    case "swap":
      return <Swap {...props} />;
    case "log-out":
      return <Logout {...props} />;
    case "settings":
      return <Settings {...props} />;
    case "message":
      return <Message {...props} />;
    case "protect":
      return <Protect {...props} />;
    case "search":
    default:
      return <Search {...props} />;
  }
}

export type IconName = (typeof AppIconsNames)[number];

const AppIconsNames = [
  "car-check-mark",
  "car-question-mark",
  "car-strike-through",
  "message-circle-full",
  "car",
  "history",
  "position-on",
  "position-off",
  "position-marker",
  "twisting-arrow",
  "directions-walk",
  "rallying-point",
  "seat",
  "arrow-switch",
  "thumb-down",
  "thumb-up",
  "liane",
  "bulb",
  "arrow-right",
  "arrow-left",
  "trash",
  "info",
  "book",
  "cloud",
  "search",
  "close",
  "send",
  "refresh",
  "flag",
  "pin",
  "people",
  "edit",
  "plus",
  "map",
  "calendar",
  "minus",
  "person",
  "wifi-off",
  "swap",
  "log-out",
  "more-vertical",
  "arrow-up",
  "arrow-down",
  "close-circle",
  "checkmark",
  "settings",
  "message",
  "protect"
] as const;
