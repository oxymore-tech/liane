import { format, parseJSON } from "date-fns";
import { Button, ListItem } from "react-native-elements";
import { ListRenderItemInfo, View } from "react-native";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import { locale } from "@/api/i18n";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { LianeTrip } from "@/api";

export function TripListItemKey(item: LianeTrip) {
  return item.id;
}

export function TripListItem({ item } : ListRenderItemInfo<LianeTrip>) {
  const date = parseJSON(item.timestamp);
  console.log("try");
  if (!item.lianes || item.lianes.length < 2) return <></>;
  console.log("render");
  const { from } = item.lianes[0];
  const { to } = item.lianes[item.lianes.length - 1];

  return (
    <ListItem bottomDivider>
      <ListItem.Content>
        <ListItem.Title>
          <View style={tw("flex flex-col")}>
            <AppText style={tw("text-gray-800 font-bold")}>{format(date, "ccc d MMM yyyy à HH:mm", { locale })}</AppText>
            <View style={tw("flex flex-row items-center")}>
              <View style={tw("flex")}>
                <AppText style={tw("text-gray-800 font-bold")}>{from.label}</AppText>
                <AppText style={tw("text-gray-400 text-xs")}>{from.label}</AppText>
              </View>
              <Ionicons style={tw("text-lg text-gray-400 mx-2")} name="arrow-forward" />
              <View style={tw("flex")}>
                <AppText style={tw("text-gray-800 font-bold")}>{to.label}</AppText>
                <AppText style={tw("text-gray-400 text-xs")}>{to.label}</AppText>
              </View>
            </View>
          </View>
        </ListItem.Title>
      </ListItem.Content>
    </ListItem>
  );
}