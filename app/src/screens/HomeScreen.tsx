import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  FlatList, ListRenderItemInfo, RefreshControl, SafeAreaView, View
} from "react-native";
import { AppContext } from "@/components/ContextProvider";
import { AppButton } from "@/components/base/AppButton";
import { sendLocations } from "@/api/location-task";
import { locale, scopedTranslate } from "@/api/i18n";
import { tw } from "@/api/tailwind";
import { Header, ListItem } from "react-native-elements";
import { RealTrip } from "@/api";
import { listTrips } from "@/api/client";
import { NavigationParamList } from "@/components/Navigation";
import { StackNavigationProp } from "@react-navigation/stack";
import { AppText } from "@/components/base/AppText";
import { format, parseJSON } from "date-fns";
import { Ionicons } from "@expo/vector-icons";

const t = scopedTranslate("Home");

type HomeNavigationProp = StackNavigationProp<NavigationParamList, "Home">;

type HomeProps = {
  navigation: HomeNavigationProp;
};

const HomeScreen = ({ navigation } : HomeProps) => {

  const [trips, setTrips] = useState<RealTrip[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { setAuthUser } = useContext(AppContext);

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
              <AppText style={tw("text-gray-800 font-bold")}>{format(date, "cccc d MMM yyyy", { locale })}</AppText>
              <View style={tw("flex flex-row items-center")}>
                <View style={tw("flex")}>
                  <AppText style={tw("text-xl text-gray-800 font-bold")}>{item.from.address.city}</AppText>
                  <AppText style={tw("text-gray-400 text-xs")}>{item.from.address.street}</AppText>
                  <AppText style={tw("text-gray-400 font-bold")}>{format(date, "HH:mm", { locale })}</AppText>
                </View>
                <Ionicons style={tw("text-lg text-gray-400 mx-2")} name="arrow-forward" />
                <View style={tw("flex")}>
                  <AppText style={tw("text-xl text-gray-800 font-bold")}>{item.to.address.city}</AppText>
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
    <SafeAreaView>
      <Header
        leftComponent={<AppButton title="Send" onPress={() => sendLocations()} />}
        centerComponent={{ text: t("Mes trajets"), style: tw("text-2xl text-white") }}
        rightComponent={(
          <AppButton
            iconStyle={tw("text-2xl text-white")}
            icon="log-out"
            onPress={() => setAuthUser(undefined)}
          />
        )}
      />
      <FlatList
        ListHeaderComponent={(<AppText style={tw("text-white font-bold bg-orange-light text-lg p-4")}>{t("trajets partagés", { count: trips.length })}</AppText>)}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}
        style={tw("")}
        keyExtractor={keyExtractor}
        data={trips}
        renderItem={renderItem}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;