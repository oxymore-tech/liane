import React, { useCallback, useState } from "react";
import { FlatList, SafeAreaView, View } from "react-native";
import { useTailwind } from "tailwind-rn";
import { useFocusEffect } from "@react-navigation/native";
import { AppText } from "@/components/base/AppText";
import { ChatMessage, RallyingPoint, TripIntentMatch } from "@/api";
import ScheduleTripItem from "@/components/ScheduleTripItem";
import { getMatches } from "@/api/client";
import { RootNavigation } from "@/api/navigation";

const ScheduleScreen = () => {
  const tw = useTailwind();
  const [matches, setMatches] = useState<TripIntentMatch[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const tripIntentMatches = await getMatches();
      setMatches(tripIntentMatches);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refresh().then();
    }, [])
  );

  const onDelete = useCallback(() => {

  }, []);

  const onChat = useCallback((matchedTripIntent) => {
    RootNavigation.navigate("Chat", { matchedTripIntent });
  }, []);

  return (
    <SafeAreaView style={tw("flex flex-col h-full")}>

      <View style={tw("pt-5 pb-5 flex-row items-center bg-orange-400")}>
        <AppText style={tw("absolute text-2xl text-center text-white w-full")}>Trajets prévus</AppText>
      </View>

      <FlatList
        style={tw("flex")}
        data={matches}
        renderItem={({ item }) => (
          <ScheduleTripItem
            tripIntentMatch={item}
            onDelete={onDelete}
            onChat={onChat}
          />
        )}
        keyExtractor={(data) => data.tripIntent.id!}
        refreshing={refreshing}
        onRefresh={refresh}
      />
    </SafeAreaView>
  );
};

export default ScheduleScreen;
