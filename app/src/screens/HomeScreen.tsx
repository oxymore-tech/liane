import React, { useCallback, useEffect, useState } from "react";
import { FlatList, SafeAreaView, StatusBar, View } from "react-native";
import { scopedTranslate } from "@/api/i18n";
import { getColor, tw } from "@/api/tailwind";
import { Liane } from "@/api";
import { listTrips } from "@/api/client";
import { AppText } from "@/components/base/AppText";
import TripListItem from "@/components/TripListItem";
import { NavigationParamList } from "@/components/Navigation";
import { StackNavigationProp } from "@react-navigation/stack";

const stubLiane = () : Liane[] => {
  const ll1 = {
    lat: 10,
    lng: 10
  };

  const rp1 = {
    id: "p1",
    position: ll1,
    label: "Test RallyingPoint 1",
    distance: 0
  };

  const rp2 = {
    id: "p2",
    position: ll1,
    label: "Test RallyingPoint 2",
    distance: 0
  };

  const lu1 = [
    {
      timestamp: 8,
      isPrimary: true,
      tripId: "id1"
    }
  ];

  return [
    {
      from: rp1,
      to: rp2,
      usages: lu1
    }
  ];
};

const t = scopedTranslate("Home");

export type HomeNavigationProp = StackNavigationProp<NavigationParamList, "Home">;

type HomeProps = {
  navigation: HomeNavigationProp;
};

const HomeScreen = ({ navigation }: HomeProps) => {
  const [, setTrips] = useState<Liane[]>([]);
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

      <View>
        <StatusBar
          backgroundColor={getColor("liane-blue")}
        />
        <View style={tw("pt-5 pb-5 flex-row items-center bg-liane-blue")}>
          <AppText style={tw("absolute text-2xl text-white text-center w-full ")}>Trajets</AppText>
        </View>
      </View>

      <View style={tw("rounded-xl bg-orange-light m-4  py-2 items-center")}>
        <AppText style={tw("text-white font-bold text-lg")}>
          {t("trajets partagés", { count: stubLiane().length, formatted_number: Math.floor(stubLiane().length) })}
        </AppText>
      </View>
      <FlatList
        data={stubLiane()}
        keyExtractor={(item) => item.from.id + item.to.id}
        renderItem={({ item }) => (
          <TripListItem
            liane={item}
            toDetails={navigation}
          />
        )}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;
