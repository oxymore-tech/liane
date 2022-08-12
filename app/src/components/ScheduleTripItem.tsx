import { tw } from "@/api/tailwind";
import { Alert, TouchableOpacity, View } from "react-native";
import { AppText } from "@/components/base/AppText";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScheduleNavigationProp } from "@/screens/ScheduleScreen";
import { MatchedTripIntent, TripIntent } from "@/api";
import { deleteTripIntent } from "@/api/client";

interface ScheduleTripItemProps {
  tripIntent: TripIntent,
  matchedIntent: MatchedTripIntent | null,
  toDetails: ScheduleNavigationProp
  refreshList: Function
}

const ScheduleTripItem = ({ tripIntent, matchedIntent, toDetails, refreshList } : ScheduleTripItemProps) => {

  const goToDetails = () => {
    toDetails.navigate("Chat", { tripIntent, matchedIntent });
  };

  const deleteIntent = async () => {
    Alert.alert(
      "Supprimer le trajet ?",
      "",
      [
        {
          text: "Non"
        },
        {
          text: "Oui",
          onPress: async () => {
            await deleteTripIntent(tripIntent.id!);
            refreshList();
          }
        }

      ],
      { cancelable: true }
    );
  };

  return (
    <TouchableOpacity
      style={tw("flex flex-row bg-gray-200 h-20 mt-2 border-solid")}
    >

      <Ionicons
        style={tw("flex-col self-center justify-around w-2/12")}
        name="help-circle-outline"
        size={65}
      />

      <View style={tw("flex-col justify-around w-2/12 mr-2 ")}>
        <AppText style={tw("flex-row ml-3 text-base")}>
          {
              `${new Date(tripIntent.fromTime).getHours().toString().padStart(2, "0")
              }:${
                new Date(tripIntent.fromTime).getMinutes().toString().padStart(2, "0")}`
            }
        </AppText>

        <Ionicons name="chevron-down" style={tw("self-center opacity-0")} />

        <AppText style={tw("flex-row ml-3 text-lg")}>
          --:--
        </AppText>
      </View>

      <View style={tw("flex-col justify-around items-center w-5/12")}>
        <AppText style={tw("flex-row")}>
          {tripIntent.from.label}
        </AppText>

        <Ionicons name="chevron-down" style={tw("self-center")} />

        <AppText style={tw("flex-row")}>
          {tripIntent.to.label}
        </AppText>
      </View>

      <TouchableOpacity style={tw("flex-col justify-center items-center w-3/12 h-full pr-8")}>
        <Ionicons
          name="chatbubbles-outline"
          size={35}
          onPress={goToDetails}
        />
      </TouchableOpacity>

      <TouchableOpacity style={tw("absolute top-1 right-1 ")}>
        <Ionicons
          name="close-outline"
          size={24}
          onPress={deleteIntent}
        />
      </TouchableOpacity>

    </TouchableOpacity>
  );
};

export default ScheduleTripItem;