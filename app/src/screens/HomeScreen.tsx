import React, { useCallback, useState } from "react";
import { FlatList, SafeAreaView, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AppText } from "@/components/base/AppText";
import { TripIntentMatch } from "@/api";
import ScheduleTripItem from "@/components/ScheduleTripItem";
import { getMatches } from "@/api/client";
import { RootNavigation } from "@/api/navigation";

const ScheduleScreen = () => {
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

  const onChat = useCallback((matchedTripIntent: TripIntentMatch) => {
    RootNavigation.navigate("Chat", { matchedTripIntent });
  }, []);

  return (
    <SafeAreaView className="flex flex-col h-full bg-gray-700">

      <View className="pt-5 pb-5 flex-row items-center">
        <AppText className="absolute text-2xl text-center text-white w-full">Mes trajets</AppText>
      </View>

      <FlatList
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
