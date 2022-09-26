import React, { useCallback, useState } from "react";
import { FlatList, SafeAreaView, View } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useTailwind } from "tailwind-rn";
import { AppText } from "@/components/base/AppText";
import { TripIntentMatch } from "@/api";
import { NavigationParamList } from "@/components/RootNavigation";
import ScheduleTripItem from "@/components/ScheduleTripItem";
import { getMatches } from "@/api/client";

export type ScheduleNavigationProp = NativeStackNavigationProp<NavigationParamList, "Home">;

type ScheduleProps = {
  navigation: ScheduleNavigationProp;
};

const ScheduleScreen = ({ navigation }: ScheduleProps) => {
  const tw = useTailwind();
  const [matches, setMatches] = useState<TripIntentMatch[]>([]);

  useFocusEffect(
    useCallback(() => {
      getMatches()
        .then((m) => setMatches(m));
    }, [])
  );

  const onDelete = useCallback(() => {

  }, []);

  return (
    <SafeAreaView style={tw("flex flex-col h-full")}>

      <View style={tw("pt-5 pb-5 flex-row items-center bg-orange-400")}>
        <AppText style={tw("absolute text-2xl text-center text-white w-full")}>Trajets prévus</AppText>
      </View>

      <View>
        <AppText style={tw("text-2xl text-gray-500")}>{matches.length}</AppText>
      </View>

      <FlatList
        style={tw("flex")}
        data={matches}
        renderItem={({ item }) => (
          <ScheduleTripItem
            tripIntentMatch={item}
            onDelete={onDelete}
            navigation={navigation}
          />
        )}
        keyExtractor={(data) => data.tripIntent.id!}
      />
    </SafeAreaView>
  );
};

export default ScheduleScreen;
