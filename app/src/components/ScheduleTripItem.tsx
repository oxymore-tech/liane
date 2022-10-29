import { Alert, TouchableOpacity, View } from "react-native";
import React from "react";
import { AppText } from "@/components/base/AppText";
import { TripIntentMatch, RallyingPoint } from "@/api";
import { Time } from "@/components/base/Time";
import { AppIcon } from "@/components/base/AppIcon";

interface ScheduleTripItemProps {
  tripIntentMatch: TripIntentMatch;
  onDelete: (tripIntentId: string) => void;
  onChat: (matchedTripIntent: TripIntentMatch) => void;
}

const ScheduleTripItem = ({ tripIntentMatch, onDelete, onChat } : ScheduleTripItemProps) => {
  const goToDetails = () => {
    onChat(tripIntentMatch);
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
            onDelete(tripIntentMatch.tripIntent.id!);
          }
        }
      ],
      { cancelable: true }
    );
  };

  const { tripIntent } = tripIntentMatch;

  const from = tripIntent.from as RallyingPoint;
  const to = tripIntent.to as RallyingPoint;

  return (
    <TouchableOpacity
      className="flex flex-row bg-gray-200 h-20 mt-2 border-solid"
    >

      <AppIcon
        className="flex-col self-center justify-around w-2/12"
        name="help-circle-outline"
        size={65}
      />

      <View className="flex-col justify-around w-2/12 mr-2 ">
        <Time value={tripIntent.goTime} />

        <AppIcon name="chevron-down" className="self-center opacity-0" />

        <Time value={tripIntent.returnTime} />
      </View>

      <View className="flex-col justify-around items-center w-5/12">
        <AppText className="flex-row">
          {from.label}
        </AppText>

        <AppIcon name="chevron-down" className="self-center" />

        <AppText className="flex-row">
          {to.label}
        </AppText>
      </View>

      <TouchableOpacity className="flex-col justify-center items-center w-3/12 h-full pr-8">
        <AppIcon
          name="chatbubbles-outline"
          size={35}
          onPress={goToDetails}
        />
      </TouchableOpacity>

      <TouchableOpacity className="absolute top-1 right-1 ">
        <AppIcon
          name="close-outline"
          size={24}
          onPress={deleteIntent}
        />
      </TouchableOpacity>

    </TouchableOpacity>
  );
};

export default ScheduleTripItem;