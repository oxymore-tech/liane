import React, { useCallback, useEffect, useState } from "react";
import { FlatList, SafeAreaView, View } from "react-native";
import { scopedTranslate } from "@/api/i18n";
import { tw } from "@/api/tailwind";
import {Liane, LianeUsage, RallyingPoint} from "@/api";
import { listTrips } from "@/api/client";
import { AppText } from "@/components/base/AppText";
import HeaderMenu from "@/components/HeaderMenu";
import TripListItem from "@/components/TripListItem";

const t = scopedTranslate("Home");

const HomeScreen = () => {
  const [trips, setTrips] = useState<Liane[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    onRefresh()
      .then();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await listTrips();
      setTrips(list.sort((a, b) => b.usages.length - a.usages.length));
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <SafeAreaView style={tw("flex h-full")}>
      <HeaderMenu name="Mes trajets" />
      <View style={tw("rounded-xl bg-orange-light m-4  py-2 items-center")}>
        <AppText style={tw("text-white font-bold text-lg")}>
          {t("trajets partagés", { count: trips.length, formatted_number: Math.floor(trips.length) })}
        </AppText>
      </View>
      <FlatList
        data={trips}
        keyExtractor={(data: Liane, i) => i.toString()}
        renderItem={({ item }) => <TripListItem liane={item} key={item.from.id + item.to.id} />}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;
