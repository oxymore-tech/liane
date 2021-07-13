import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { scopedTranslate } from "@/api/i18n";
import { tw } from "@/api/tailwind";
import { Liane } from "@/api";
import { listTrips } from "@/api/client";
import { AppText } from "@/components/base/AppText";
import HeaderMenu from "@/components/HeaderMenu";
import TripListItem from "@/components/TripListItem";

const t = scopedTranslate("Home");

const HomeScreen = () => {
  const [trips, setTrips] = useState<Liane[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setRefreshing(true);
    listTrips()
      .then((l) => {
        l.sort((a:Liane, b: Liane) => b.usages.length - a.usages.length);
        setTrips(l);
      })
      .finally(() => setRefreshing(false));
  }, []);

  /* const onRefresh = useCallback(() => {
    setRefreshing(true);
    listTrips()
      .then((l) => setTrips(l))
      .finally(() => setRefreshing(false));
  }, []); */

  return (
    <View>
      <View style={{ zIndex: 1 }}>
        <HeaderMenu name="Mes trajets" />
      </View>
      <View style={tw("rounded-xl bg-orange-light m-4  py-2 items-center")}>
        <AppText style={tw("text-white font-bold text-lg")}>
          {t("trajets partagés", { count: trips.length, formatted_number: Math.floor(trips.length) })}
        </AppText>
      </View>
      <ScrollView>
        {
          trips.map((l: Liane) => <TripListItem liane={l} key={l.from.id + l.to.id} />)
        }
      </ScrollView>
    </View>
  );
};

export default HomeScreen;
