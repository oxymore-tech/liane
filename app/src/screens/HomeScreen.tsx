import React, { useCallback, useEffect, useState } from "react";
import { FlatList, ListRenderItemInfo, RefreshControl, View } from "react-native";
import { locale, scopedTranslate } from "@/api/i18n";
import { tw } from "@/api/tailwind";
import { ListItem } from "react-native-elements";
import { RealTrip } from "@/api";
import { listTrips } from "@/api/client";
import { AppText } from "@/components/base/AppText";
import { format, parseJSON } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import i18n from "i18n-js";
import HeaderMenu from "@/components/HeaderMenu";

const t = scopedTranslate("Home");

const HomeScreen = () => {

  const [trips, setTrips] = useState<RealTrip[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setRefreshing(true);
    listTrips()
      .then((l) => setTrips(l))
      .finally(() => setRefreshing(false));
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    listTrips()
      .then((l) => setTrips(l))
      .finally(() => setRefreshing(false));
  }, []);

  const keyExtractor = (item: RealTrip) => item.startTime.toString();

  const renderItem = ({ item } : ListRenderItemInfo<RealTrip>) => {
    const date = parseJSON(item.startTime);
    return (
      <ListItem bottomDivider>
        <ListItem.Content>
          <ListItem.Title>
            <View style={tw("flex flex-col")}>
              <AppText style={tw("text-gray-800 font-bold")}>{format(date, "ccc d MMM yyyy", { locale })}</AppText>
              <View style={tw("flex flex-row items-center")}>
                <View style={tw("flex")}>
                  <AppText style={tw("text-gray-800 font-bold")}>{item.from.address.city}</AppText>
                  <AppText style={tw("text-gray-400 text-xs")}>{item.from.address.street}</AppText>
                  <AppText style={tw("text-gray-400 font-bold")}>{format(date, "HH:mm", { locale })}</AppText>
                </View>
                <Ionicons style={tw("text-lg text-gray-400 mx-2")} name="arrow-forward" />
                <View style={tw("flex")}>
                  <AppText style={tw("text-gray-800 font-bold")}>{item.to.address.city}</AppText>
                  <AppText style={tw("text-gray-400 text-xs")}>{item.to.address.street}</AppText>
                  <AppText style={tw("text-gray-400 font-bold")}>{format(parseJSON(item.endTime), "HH:mm", { locale })}</AppText>
                </View>
              </View>
            </View>
          </ListItem.Title>
        </ListItem.Content>
      </ListItem>
    );
  };
  return (
    <View>
      <View style={{ zIndex: 1 }}>
        <HeaderMenu name="Mes trajets" />
      </View>
      <FlatList
        ListHeaderComponent={(
          <View style={tw("rounded-xl bg-orange-light m-4  py-2 items-center")}>
            <AppText style={tw("text-white font-bold text-lg")}>
              {t("trajets partagés", { count: trips.length, formatted_number: i18n.toNumber(trips.length) })}
            </AppText>
          </View>
        )}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}
        keyExtractor={keyExtractor}
        data={trips}
        renderItem={renderItem}
      />
    </View>
  );
};

export default HomeScreen;