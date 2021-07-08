import { ListItem } from "react-native-elements";
import { ListRenderItemInfo, Text, View } from "react-native";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import { scopedTranslate } from "@/api/i18n";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Liane } from "@/api";
import { AppButton } from "@/components/base/AppButton";

const t = scopedTranslate("TripList");

export function TripListItemKey(item: Liane) {
  return item.from.id + item.to.id;
}

export function TripListItem({ item } : ListRenderItemInfo<Liane>) {
  const [showDetails, setShowDetails] = useState(false);

  if (!item.usages || item.usages.length < 1) return <></>;

  const { from, to } = item;

  return (
    <ListItem bottomDivider>
      <ListItem.Content>
        <ListItem.Title>
          <View style={tw("flex flex-row items-baseline")}>
            <View style={tw("")}>
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
              <AppText style={tw("text-gray-400 font-bold text-sm")}>{t("trajet réalisé", { count: item.usages.length })}</AppText>
            </View>
            <View style={tw("")}>
              <AppButton
                buttonStyle={tw("bg-red-500 p-2 m-1 text-xs")}
                titleStyle={tw("text-sm")}
                onPress={() => console.log(1)}
                title={t("supprimer")}
              />
              <AppButton
                buttonStyle={tw("bg-gray-500 p-2 m-1")}
                titleStyle={tw("text-sm")}
                onPress={() => setShowDetails(!showDetails)}
                title={t("détail")}
              />
            </View>
          </View>
          {showDetails
          && <View><Text>Détails</Text></View>}
        </ListItem.Title>
      </ListItem.Content>
    </ListItem>
  );
}