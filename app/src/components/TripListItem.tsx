import { Alert, View } from "react-native";
import { parseJSON } from "date-fns";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import { scopedTranslate } from "@/api/i18n";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState} from "react";
import { Liane, LianeUsage } from "@/api";
import { AppButton } from "@/components/base/AppButton";
import { HomeNavigationProp } from "@/screens/HomeScreen";

const t = scopedTranslate("TripList");

interface TripListItemProps {
  liane: Liane,
  itemKey: string
  toDetails: HomeNavigationProp
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

const TripListItem = ({ liane, toDetails } : TripListItemProps) => {
  const [details, setDetails] = useState<Map<DetailKey, DetailValue>>(new Map<DetailKey, DetailValue>());

  if (!liane.usages || liane.usages.length < 1) return <></>;

  const { from, to, usages } = liane;
  
  useEffect(() => {
    setDetails(computeDetails(usages));
  }, []);
  
  const goToDetails = () => {
    toDetails.navigate("Details", { tripID: "tripKey" });
  }

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
        <View style={tw("flex-grow")}>
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
        <View style={tw("flex-none")}>
          <AppButton
            buttonStyle={tw("bg-red-500 p-2 m-1 text-xs")}
            titleStyle={tw("text-sm")}
            onPress={del}
            title={t("supprimer")}
          />
          <AppButton
            buttonStyle={tw("bg-gray-500 p-2 m-1")}
            titleStyle={tw("text-sm")}
            onPress={goToDetails}
            title={t("détail")}
          />
        </View>
      </View>
      {
          details
          && Array.from(details.entries()).sort((a: [string, DetailValue], b: [string, DetailValue]) => b[1].count - a[1].count).map((v: [string, DetailValue]) => (
              <AppText key={v[0]} style={tw("text-gray-800")}>
                {t("jourheureformat", { count: v[1].count, day: v[1].day, hour: v[1].hour })}
              </AppText>
          ))
      }
      
    </View>
  );
};

export default TripListItem;
