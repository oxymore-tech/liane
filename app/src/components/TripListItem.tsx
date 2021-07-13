import { ListItem } from "react-native-elements";
import { Alert, ListRenderItemInfo, Text, View } from "react-native";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import { scopedTranslate } from "@/api/i18n";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Liane, LianeUsage } from "@/api";
import { AppButton } from "@/components/base/AppButton";

const t = scopedTranslate("TripList");

interface DetailKey {
  day: string,
  hour: number
}

function computeDetails(usages: LianeUsage[]): Map<DetailKey, number> {
  const details = new Map<DetailKey, number>();

  usages.forEach((u: LianeUsage) => {
    // Get the date
    const d: Date = new Date();
    d.setUTCDate(u.timestamp);

    // Compute the key
    const key: DetailKey = { day: t(`jour${d.getDay()}`), hour: d.getHours() };

    // Update the dict
    if (details.has(key)) {
      details.set(key, details.get(key)! + 1);
    } else {
      details.set(key, 1);
    }
  });

  return details;
}

export function TripListItemKey(item: Liane) {
  return item.from.id + item.to.id;
}

function TripListItem({ item } : ListRenderItemInfo<Liane>) {
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<Map<DetailKey, number>>();

  if (!item.usages || item.usages.length < 1) return <></>;

  const { from, to, usages } = item;

  const updateDetails = () => {
    setShowDetails(!showDetails);

    if (!details) {
      setDetails(computeDetails(usages));
    }
  };

  const del = () => {
    Alert.alert(
      t("suppressionTitle"),
      t("suppressionText"),
      [
        { text: t("suppressionNon"), style: "cancel" },
        { text: t("suppressionOui") }
      ],
      { cancelable: true }
    );
  };

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
                onPress={del}
                title={t("supprimer")}
              />
              <AppButton
                buttonStyle={tw("bg-gray-500 p-2 m-1")}
                titleStyle={tw("text-sm")}
                onPress={updateDetails}
                title={t("détail")}
              />
            </View>
          </View>
          {
            showDetails && details
            && details.forEach((amount, key) => (
              <AppText style={tw("text-gray-800 font-bold")}>
                {t("jourheureformat", { count: amount, day: key.day, hour: key.hour })}
              </AppText>
            ))
          }
        </ListItem.Title>
      </ListItem.Content>
    </ListItem>
  );
}

export default TripListItem;