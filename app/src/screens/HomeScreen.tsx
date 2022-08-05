import React, { useCallback, useEffect, useState } from "react";
import { FlatList, SafeAreaView, StatusBar, View } from "react-native";
import { scopedTranslate } from "@/api/i18n";
import { getColor, tw } from "@/api/tailwind";
import { Liane, TripFilterOptions } from "@/api";
import { listTrips, snapLianes } from "@/api/client";
import { AppText } from "@/components/base/AppText";
import TripListItem from "@/components/TripListItem";
import { NavigationParamList } from "@/components/Navigation";
import { StackNavigationProp } from "@react-navigation/stack";
import Map, { MarkerProps, RouteProps } from "@/components/Map";
import { AppButton } from "@/components/base/AppButton";
import { getLastKnownLocation } from "@/api/location";
import { LatLng } from "react-native-maps";

const stubLiane = () : Liane[] => {
  const ll1 = {
    lat: 10,
    lng: 10
  };

  const rp1 = {
    id: "p1",
    location: ll1,
    label: "Test RallyingPoint 1",
    distance: 0
  };

  const rp2 = {
    id: "p2",
    location: ll1,
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
  const [routes, setRoutes] = useState<RouteProps[]>();
  const [markers, setMarkers] = useState<MarkerProps[]>();
  const [currentPos, setCurrentPos] = useState<LatLng>({
    latitude: 44.51944,
    longitude: 3.50139
  });

  useEffect(() => {
    onRefresh().then();
    getLastKnownLocation().then((pos) => setCurrentPos({ latitude: pos.lat, longitude: pos.lng }));
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

  const onLoadLianes = useCallback(async () => {
    const pos = await getLastKnownLocation();
    const lianes = await snapLianes({ center: await getLastKnownLocation() } as TripFilterOptions);

    setMarkers([{ coordinate: { latitude: pos.lat, longitude: pos.lng } }]);
    setRoutes(lianes.map((l) => ({ coordinates: l.route.coordinates.map((c) => ({ latitude: c.lat, longitude: c.lng })) })));
    // TODO : du refactoring pour gérer la compatibilité des différents LatLng
  }, []);

  return (
    <SafeAreaView style={tw("flex h-full")}>
      <View>
        <StatusBar
          backgroundColor={getColor("liane-orange")}
        />
        <View style={tw("pt-5 pb-5 flex-row items-center bg-liane-orange")}>
          <AppText style={tw("absolute text-2xl text-white text-center w-full ")}>Trajets</AppText>
        </View>
      </View>

      <View style={tw("rounded-xl bg-orange-light m-4 py-2 items-center")}>
        <AppText style={tw("text-white font-bold text-lg")}>
          {t("trajets partagés", { count: stubLiane().length, formatted_number: Math.floor(stubLiane().length) })}
        </AppText>
      </View>

      <View style={tw("flex m-4 p-4 h-2/4 bg-gray-300 rounded-xl")}>
        <AppButton
          title="Charger les lianes"
          buttonStyle={tw("mb-4 bg-liane-royal rounded-full")}
          onPress={onLoadLianes}
        />
        <Map
          center={currentPos}
          style={tw("w-full flex-grow")}
          markers={markers}
          routes={routes}
          scrollEnabled={false}
          rotateEnabled={false}
        />
      </View>

      <FlatList
        data={stubLiane()}
        keyExtractor={(data: Liane, i) => i.toString()}
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
