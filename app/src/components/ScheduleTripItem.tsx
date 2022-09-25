import { Alert, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTailwind } from "tailwind-rn";
import { AppText } from "@/components/base/AppText";
import { ScheduleNavigationProp } from "@/screens/ScheduleScreen";
import { MatchedTripIntent, RallyingPoint } from "@/api";

interface ScheduleTripItemProps {
  matchedTripIntent: MatchedTripIntent;
  toDetails: ScheduleNavigationProp;
  onDelete: (tripIntentId: string) => void;
}

const ScheduleTripItem = ({ matchedTripIntent, toDetails, onDelete } : ScheduleTripItemProps) => {
  const tw = useTailwind();

  const goToDetails = () => {
    toDetails.navigate("Chat", { matchedTripIntent });
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
            onDelete(matchedTripIntent.tripIntent.id!);
          }
        }
      ],
      { cancelable: true }
    );
  };

  const { tripIntent } = matchedTripIntent;

  const from = tripIntent.from as RallyingPoint;
  const to = tripIntent.to as RallyingPoint;

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
            `${tripIntent.goTime.hour.toString().padStart(2, "0")}:${tripIntent.goTime.minute.toString().padStart(2, "0")}`
          }
        </AppText>

        <Ionicons name="chevron-down" style={tw("self-center opacity-0")} />

        <AppText style={tw("flex-row ml-3 text-lg")}>
          --:--
        </AppText>
      </View>

      <View style={tw("flex-col justify-around items-center w-5/12")}>
        <AppText style={tw("flex-row")}>
          {from.label}
        </AppText>

        <Ionicons name="chevron-down" style={tw("self-center")} />

        <AppText style={tw("flex-row")}>
          {to.label}
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