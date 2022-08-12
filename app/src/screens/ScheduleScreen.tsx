import React, { useState } from "react";
import { FlatList, SafeAreaView, View } from "react-native";
import { tw } from "@/api/tailwind";
import { AppText } from "@/components/base/AppText";
import { MatchedTripIntent, TripIntent } from "@/api";
import { StackNavigationProp } from "@react-navigation/stack";
import { NavigationParamList } from "@/components/Navigation";
import ScheduleTripItem from "@/components/ScheduleTripItem";
import { getMatches, getTripIntents } from "@/api/client";
import { useFocusEffect } from "@react-navigation/native";

export type ScheduleNavigationProp = StackNavigationProp<NavigationParamList, "Schedule">;

type ScheduleProps = {
  navigation: ScheduleNavigationProp;
};

const ScheduleScreen = ({ navigation }: ScheduleProps) => {
  const [tripIntentsToMatch, setTripIntentsToMatch] = useState<[TripIntent, MatchedTripIntent | null][]>([]);

  const refreshIntents = () => {
    getTripIntents().then((intents: TripIntent[]) => {
      getMatches().then((groups: MatchedTripIntent[]) => {
        // TODO : Show the number of trip who matched with ours

        const intentsToMatch: [TripIntent, MatchedTripIntent | null][] = [];

        intents.forEach((ti) => {
          groups.forEach((mt) => {

            let match: MatchedTripIntent | null = null;
            if (mt.tripIntent.id === ti.id) {
              match = mt;
            }
            intentsToMatch.push([ti, match]);
          });

          setTripIntentsToMatch(intentsToMatch);
        });
      });
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      refreshIntents();
    }, [])
  );

  return (
    <SafeAreaView style={tw("flex flex-col h-full")}>

      <View style={tw("pt-5 pb-5 flex-row items-center bg-liane-orange")}>
        <AppText style={tw("absolute text-2xl text-center text-white w-full")}>Trajets prévus</AppText>
      </View>

      <FlatList
        style={tw("flex")}
        data={tripIntentsToMatch}
        renderItem={({ item }) => (
          <ScheduleTripItem
            tripIntent={item[0]}
            matchedIntent={item[1]}
            toDetails={navigation}
            refreshList={refreshIntents}
          />
        )}
        keyExtractor={(data) => data[0].id!}
      />
    </SafeAreaView>
  );
};

export default ScheduleScreen;
