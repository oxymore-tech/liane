import React, { useCallback, useState } from "react";
import { SafeAreaView, View } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useTailwind } from "tailwind-rn";
import { FlashList } from "@shopify/flash-list";
import { AppText } from "@/components/base/AppText";
import { MatchedTripIntent } from "@/api";
import { NavigationParamList } from "@/components/Navigation";
import ScheduleTripItem from "@/components/ScheduleTripItem";
import { getMatches } from "@/api/client";

export type ScheduleNavigationProp = NativeStackNavigationProp<NavigationParamList, "Schedule">;

type ScheduleProps = {
  navigation: ScheduleNavigationProp;
};

const ScheduleScreen = ({ navigation }: ScheduleProps) => {
  const tw = useTailwind();
  const [matches, setMatches] = useState<MatchedTripIntent[]>([]);

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

      <FlashList
        style={tw("flex")}
        data={matches}
        estimatedItemSize={10}
        renderItem={({ item }) => (
          <ScheduleTripItem
            matchedTripIntent={item}
            onDelete={onDelete}
            toDetails={navigation}
          />
        )}
        keyExtractor={(data) => data[0].id!}
      />
    </SafeAreaView>
  );
};

export default ScheduleScreen;
