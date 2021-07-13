import { parseJSON } from "date-fns";
import { Alert, View } from "react-native";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import { scopedTranslate } from "@/api/i18n";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Liane, LianeUsage } from "@/api";
import { AppButton } from "@/components/base/AppButton";

const t = scopedTranslate("TripList");

interface TripListItemProps {
  liane: Liane,
  key: string
}

type DetailKey = string;
type DetailValue = {
  day: string,
  hour: number,
  count: number
};

function computeDetails(usages: LianeUsage[]): Map<DetailKey, DetailValue> {
  const details = new Map<DetailKey, DetailValue>();

  usages.forEach((u: LianeUsage) => {
    // Get the date
    const d: Date = parseJSON(u.timestamp);

    // Compute the key
    const key: DetailKey = d.getDay().toString() + d.getHours().toString();
    const value: DetailValue = {
      day: t(`jour${d.getDay()}`),
      hour: d.getHours(),
      count: 1
    };

    // Update the dict
    if (details.has(key)) {
      value.count += details.get(key)!.count;
    }

    details.set(key, value);
  });

  return details;
}

const TripListItem = ({ liane } : TripListItemProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<Map<DetailKey, DetailValue>>(new Map<DetailKey, DetailValue>());

  if (!liane.usages || liane.usages.length < 1) return <></>;

  const { from, to, usages } = liane;

  const updateDetails = () => {
    setShowDetails(!showDetails);

    console.log(showDetails);

    if (!showDetails) {
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
    <View style={tw("px-3 py-2 border-b-1 border-gray-300")}>
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
          <AppText style={tw("text-gray-400 font-bold text-sm")}>{t("trajet réalisé", { count: liane.usages.length })}</AppText>
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
        && Array.from(details.values()).sort((a: DetailValue, b: DetailValue) => b.count - a.count).map((v: DetailValue) => (
          <AppText style={tw("text-gray-800")}>
            {t("jourheureformat", { count: v.count, day: v.day, hour: v.hour })}
          </AppText>
        ))
      }
    </View>
  );
};

export default TripListItem;
